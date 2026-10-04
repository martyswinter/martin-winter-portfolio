<?php

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// ===== JSON odpověď =====

function respond($status, $data)
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

// ===== Pouze POST =====

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');

    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

// ===== Načtení hodnot formuláře =====

function postValue($key)
{
    $value = $_POST[$key] ?? '';

    return is_string($value) ? trim($value) : '';
}

$name = postValue('name');
$email = postValue('email');
$message = postValue('message');
$recaptchaToken = postValue('recaptcha_token');

// ===== Validace polí =====

if ($name === '' || $email === '' || $message === '') {
    respond(422, [
        'success' => false,
        'message' => 'Please fill in all required fields.'
    ]);
}

if (
    strlen($email) > 254 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    !preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email)
) {
    respond(422, [
        'success' => false,
        'message' => 'Please enter a valid email address.'
    ]);
}

// Kontrola délky i platného UTF-8.
// Jméno nesmí obsahovat zalomení řádku.

if (
    !preg_match('/\A[^\r\n]{1,100}\z/u', $name) ||
    !preg_match('/\A.{1,5000}\z/us', $message)
) {
    respond(422, [
        'success' => false,
        'message' => 'Please check your name and message length.'
    ]);
}

if ($recaptchaToken === '' || strlen($recaptchaToken) > 10000) {
    respond(422, [
        'success' => false,
        'message' => 'Verification failed. Please try again.'
    ]);
}

// ===== Konfigurace a PHPMailer =====

try {
    require __DIR__ . '/config.php';

    require __DIR__ . '/PHPMailer/src/Exception.php';
    require __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require __DIR__ . '/PHPMailer/src/SMTP.php';

    // ===== Serverové ověření reCAPTCHA =====

    $verificationData = http_build_query([
        'secret' => $recaptchaSecret,
        'response' => $recaptchaToken
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' =>
                "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $verificationData,
            'timeout' => 10
        ]
    ]);

    $verificationResponse = @file_get_contents(
        'https://www.google.com/recaptcha/api/siteverify',
        false,
        $context
    );

    if ($verificationResponse === false) {
        throw new RuntimeException('reCAPTCHA service unavailable.');
    }

    $verification = json_decode($verificationResponse, true);

    $allowedHostnames = [
        'winter-ux.eu',
        'www.winter-ux.eu'
    ];

    if (
        !is_array($verification) ||
        ($verification['success'] ?? false) !== true ||
        ($verification['action'] ?? '') !== 'contact' ||
        ($verification['score'] ?? 0) < 0.5 ||
        !in_array(
            $verification['hostname'] ?? '',
            $allowedHostnames,
            true
        )
    ) {
        respond(403, [
            'success' => false,
            'message' => 'Verification failed. Please try again.'
        ]);
    }

    // ===== Nastavení SMTP =====

    function createContactMailer(
        $host,
        $port,
        $username,
        $password
    ) {
        $mail = new PHPMailer(true);

        $mail->isSMTP();
        $mail->Host = $host;
        $mail->SMTPAuth = true;
        $mail->Username = $username;
        $mail->Password = $password;

        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $port;

        $mail->CharSet = 'UTF-8';
        $mail->Timeout = 20;

        $mail->setFrom($username, 'Martin Winter');
        $mail->isHTML(false);

        return $mail;
    }

    // ===== Zpráva pro tebe =====

    $mail = createContactMailer(
        $smtpHost,
        $smtpPort,
        $smtpUsername,
        $smtpPassword
    );

    $mail->addAddress($recipientEmail);

    // Kliknutí na Reply odpoví návštěvníkovi.
    $mail->addReplyTo($email, $name);

    $mail->Subject = 'New message from winter-ux.eu';

    $mail->Body =
        "Name: {$name}\n" .
        "Email: {$email}\n\n" .
        "Message:\n{$message}\n";

    $mail->send();

} catch (Throwable $error) {
    error_log('Contact form: ' . $error->getMessage());

    respond(500, [
        'success' => false,
        'message' =>
            'Your message could not be sent. Please try again.'
    ]);
}

// ===== Potvrzení návštěvníkovi =====

// Selhání potvrzení neznamená selhání hlavní zprávy.
// Ta už byla úspěšně odeslána.

$confirmationSent = false;

try {
    $confirmation = createContactMailer(
        $smtpHost,
        $smtpPort,
        $smtpUsername,
        $smtpPassword
    );

    $confirmation->addAddress($email, $name);
    $confirmation->addReplyTo($recipientEmail, 'Martin Winter');

    $confirmation->Subject = 'Thanks for reaching out!';

    $confirmation->Body =
        "Hi,\n\n" .
        "Thanks for reaching out through winter-ux.eu.\n" .
        "I've received your message and will get back to you " .
        "as soon as I can.\n\n" .
        "Best,\n" .
        "Martin Winter\n" .
        "https://winter-ux.eu\n";

    $confirmation->send();

    $confirmationSent = true;

} catch (Throwable $error) {
    error_log('Contact confirmation: ' . $error->getMessage());
}

// ===== Úspěšná odpověď =====

respond(200, [
    'success' => true,
    'confirmationSent' => $confirmationSent
]);