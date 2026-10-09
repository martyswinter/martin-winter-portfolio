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

$confirmation->CharSet = 'UTF-8';
$confirmation->isHTML(true);

// Logo vložené přímo do e-mailu.
$confirmation->addEmbeddedImage(
    __DIR__ . '/logo_wux_signature.png',
    'winter-ux-logo',
    'logo_wux_signature.png'
);

$confirmation->Body = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<body style="margin: 0; padding: 20px; background-color: #ffffff; color: #212121;">

    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
        <p style="margin: 0 0 16px;">Hi,</p>

        <p style="margin: 0 0 16px;">
            Thanks for reaching out through winter-ux.eu.<br>
            I've received your message and will get back to you
            as soon as I can.
        </p>

        <p style="margin: 0 0 16px;">Best,</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
        style="border-collapse: collapse;">
        <tr>
            <td style="font-family: 'Cascadia Mono', 'Courier New', monospace;
                font-size: 21px; font-weight: 600; color: #212121;">
                Martin Winter
            </td>
        </tr>

        <tr>
            <td style="padding-top: 4px; font-family: Verdana, sans-serif;
                font-size: 10px; color: #666666;">
                Česky · English · Deutsch
            </td>
        </tr>

        <tr>
            <td style="padding: 16px 0;">
                <img src="cid:winter-ux-logo"
                    alt="Winter UX"
                    width="282"
                    style="display: block; width: 282px; max-width: 100%;
                        height: auto; border: 0;">
            </td>
        </tr>

        <tr>
            <td style="font-family: 'Cascadia Mono', 'Courier New', monospace;
                font-size: 14px; line-height: 1.6;">
                <a href="tel:+420603796561"
                    style="color: #212121; text-decoration: none;">
                    +420 603 796 561</a><br>
                <a href="tel:+491625339592"
                    style="color: #212121; text-decoration: none;">
                    +49 162 533 9592</a>
            </td>
        </tr>

        <tr>
            <td style="padding-top: 8px;
                font-family: 'Cascadia Mono', 'Courier New', monospace;
                font-size: 14px; line-height: 1.6;">
                <a href="https://winter-ux.eu/"
                    style="color: #002451;">winter-ux.eu</a>
                &nbsp;·&nbsp;
                <a href="https://www.linkedin.com/in/martin-winter1/"
                    style="color: #002451;">LinkedIn</a>
                &nbsp;·&nbsp;
                <a href="https://www.malt.de/profile/martinwinter2?overview"
                    style="color: #002451;">Malt</a>
            </td>
        </tr>
    </table>

</body>
</html>
HTML;

// Textová alternativa pro klienty, které nezobrazují HTML.
$confirmation->AltBody = <<<'TEXT'
Hi,

Thanks for reaching out through winter-ux.eu.
I've received your message and will get back to you as soon as I can.

Best,
Martin Winter
Česky · English · Deutsch

+420 603 796 561
+49 162 533 9592

https://winter-ux.eu/
https://www.linkedin.com/in/martin-winter1/
https://www.malt.de/profile/martinwinter2?overview
TEXT;

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