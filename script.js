// ===== Expansive Tile Accordion =====

const expansiveTiles = document.querySelectorAll(".expansive-tile");

expansiveTiles.forEach(tile => {

    const toggleButton = tile.querySelector(".tile-toggle");
    const closeButton = tile.querySelector(".tile-close");
    const body = tile.querySelector(".tile-body");

    function openTile() {

        tile.classList.add("expanded");

        // vypočítá aktuální výšku obsahu
        body.style.maxHeight = body.scrollHeight + "px";

        toggleButton.textContent = "Show less...";
        toggleButton.setAttribute("aria-expanded", "true");
    }


    function closeTile() {

        tile.classList.remove("expanded");

        body.style.maxHeight = "0px";

        toggleButton.textContent = "Show more...";
        toggleButton.setAttribute("aria-expanded", "false");
    }


    toggleButton.addEventListener("click", () => {

        if (tile.classList.contains("expanded")) {
            closeTile();
        } else {
            openTile();
        }

    });


    if (closeButton) {

        closeButton.addEventListener("click", () => {
            closeTile();
        });

    }


    // Přepočítání výšky při změně velikosti obrazovky
    window.addEventListener("resize", () => {

        if (tile.classList.contains("expanded")) {

            body.style.maxHeight = body.scrollHeight + "px";

        }

    });

});


// Přepočítání po kompletním načtení obrázků
window.addEventListener("load", () => {

    document.querySelectorAll(".expansive-tile.expanded .tile-body")
        .forEach(body => {

            body.style.maxHeight = body.scrollHeight + "px";

        });

});

// ===== Mobile navigation =====
const burger = document.querySelector(".burger");
const menu = document.querySelector(".navbar-links");

if (burger && menu) {
    burger.addEventListener("click", () => {
        menu.classList.toggle("open");
    });

    const navLinks = document.querySelectorAll(".navbar-links a");

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("open");
        });
    });

    document.addEventListener("click", (event) => {
        if (
            menu.classList.contains("open") &&
            !menu.contains(event.target) &&
            !burger.contains(event.target)
        ) {
            menu.classList.remove("open");
        }
    });
}

// ===== Contact modal =====

const contactModal = document.querySelector("#contactModal");
const openContactButton = document.querySelector("#openContactModal");

if (contactModal && openContactButton) {

    let previousOverflow = "";

    openContactButton.addEventListener("click", () => {

        if (contactModal.open) return;

        previousOverflow = document.documentElement.style.overflow;

        contactModal.showModal();
        document.documentElement.style.overflow = "hidden";

        // Zavření mobilního menu
        if (menu) {
            menu.classList.remove("open");
        }

    });

    // Zavření přes křížek, Cancel nebo Close
    contactModal.querySelectorAll("[data-contact-close]")
        .forEach(button => {

            button.addEventListener("click", () => {
                contactModal.close();
            });

        });

    // Zavření kliknutím na pozadí mimo modal
    contactModal.addEventListener("click", event => {

        if (event.target !== contactModal) return;

        const bounds = contactModal.getBoundingClientRect();

        const outsideModal =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;

        if (outsideModal) {
            contactModal.close();
        }

    });

    // Platí také při zavření klávesou Escape
    contactModal.addEventListener("close", () => {

        document.documentElement.style.overflow = previousOverflow;
        openContactButton.focus();

    });

    const contactForm = contactModal.querySelector("#contact-form");

    if (contactForm) {

        const contactEmail = contactForm.querySelector("#contactEmail");
        const contactName = contactForm.querySelector("#contactName");
        const contactMessage = contactForm.querySelector("#contactMessage");
        const contactSubmit = contactForm.querySelector("#contactSubmit");

        const fields = [
            contactEmail,
            contactName,
            contactMessage
        ];

        const requiredMessages = {
            contactEmail: "Please enter your email.",
            contactName: "Please enter your name.",
            contactMessage: "Please enter your message."
        };

        contactForm.noValidate = true;

        // Vytvoření chybových hlášek pod poli
        fields.forEach(input => {

            const error = document.createElement("span");

            error.className = "contact-field-error";
            error.id = `${input.id}Error`;
            error.hidden = true;
            error.setAttribute("aria-live", "polite");

            input.closest(".contact-field").append(error);

            const descriptions =
                input.getAttribute("aria-describedby") || "";

            input.setAttribute(
                "aria-describedby",
                `${descriptions} ${error.id}`.trim()
            );

        });

        function checkField(input) {

            input.setCustomValidity("");

            return input.validity.valid;

        }

        function validateField(input) {

            const valid = checkField(input);
            const field = input.closest(".contact-field");
            const error = document.getElementById(`${input.id}Error`);

            field.classList.toggle("has-error", !valid);
            input.setAttribute("aria-invalid", String(!valid));

            error.hidden = valid;

            error.textContent = valid
                ? ""
                : (input.validity.typeMismatch || input.validity.patternMismatch)
                    ? "Please enter a valid email address."
                    : input.validity.tooLong
                        ? "Please shorten this text."
                        : requiredMessages[input.id];

            return valid;

        }

        function updateSubmitState() {

            const results = fields.map(checkField);

            contactSubmit.disabled =
                results.some(valid => !valid);

        }

        fields.forEach(input => {

            // Kontrola po opuštění pole
            input.addEventListener("blur", () => {

                validateField(input);
                updateSubmitState();

            });

            // Aktualizace tlačítka a již zobrazené chyby
            input.addEventListener("input", () => {

                if (input.getAttribute("aria-invalid") === "true") {
                    validateField(input);
                }

                updateSubmitState();

            });

        });

        let isSending = false;

        openContactButton.addEventListener("click", () => {

            const success = contactModal.querySelector("#contactSuccess");

            if (!success || success.hidden || isSending) return;

            contactForm.reset();
            contactForm.hidden = false;
            success.hidden = true;

            fields.forEach(input => {

                input.setCustomValidity("");
                input.removeAttribute("aria-invalid");

                input.closest(".contact-field")
                    .classList.remove("has-error");

                const error =
                    document.getElementById(`${input.id}Error`);

                if (error) {
                    error.hidden = true;
                    error.textContent = "";
                }

            });

            updateSubmitState();

            contactForm.querySelector("[autofocus]")?.focus();

        });

        contactForm.addEventListener("submit", async event => {

            event.preventDefault();

            if (isSending) return;

            const results = fields.map(validateField);
            const firstInvalid = results.indexOf(false);

            if (firstInvalid !== -1) {
                fields[firstInvalid].focus();
                return;
            }

            const tokenInput =
                contactForm.querySelector("#contactRecaptchaToken");

            const formError =
                contactForm.querySelector("#contactFormError");

            const success =
                contactModal.querySelector("#contactSuccess");

            const submitLabel =
                contactSubmit.querySelector(".contact-submit-label");

            if (!tokenInput || !formError || !success) {
                console.error("Missing contact form elements.");
                return;
            }

            const originalLabel = submitLabel?.textContent;

            isSending = true;

            formError.hidden = true;
            formError.textContent = "";

            contactSubmit.disabled = true;
            contactSubmit.classList.add("is-loading");
            contactForm.setAttribute("aria-busy", "true");

            if (submitLabel) {
                submitLabel.textContent = "Sending…";
            }

            try {

                if (
                    !window.grecaptcha ||
                    typeof window.grecaptcha.execute !== "function"
                ) {
                    throw new Error(
                        "Verification could not load. Please reload the page and try again."
                    );
                }

                // Počká na připravenost reCAPTCHA.
                await new Promise(resolve => {
                    window.grecaptcha.ready(resolve);
                });

                // Nový token získáme až při odesílání.
                tokenInput.value = await window.grecaptcha.execute(
                    "6Lenqt4tAAAAALaF6XeiJVHCsxN5cpFKDGJKPlyk",
                    {
                        action: "contact"
                    }
                );

                const response = await fetch("send-contact.php", {
                    method: "POST",
                    body: new FormData(contactForm),
                    headers: {
                        Accept: "application/json"
                    }
                });

                const result = await response.json();

                if (!response.ok || result.success !== true) {
                    throw new Error(
                        result.message ||
                        "Your message could not be sent. Please try again."
                    );
                }

                const successText = success.querySelector("p");

                if (successText) {
                    successText.textContent = result.confirmationSent
                        ? "Your message has been sent. You'll receive an email confirmation shortly. I'll get back to you as soon as I can."
                        : "Your message has been sent. The confirmation email could not be sent, but I'll get back to you as soon as I can.";
                }

                contactForm.hidden = true;
                success.hidden = false;

                success.setAttribute("tabindex", "-1");

                if (contactModal.open) {
                    success.focus();
                }

            } catch (error) {

                console.error("Contact form submission failed:", error);

                formError.textContent =
                    error instanceof Error &&
                        (
                            error.message.startsWith("Verification") ||
                            error.message.startsWith("Please") ||
                            error.message.startsWith("Your message")
                        )
                        ? error.message
                        : "Your message could not be sent. Please try again.";

                formError.hidden = false;

            } finally {

                tokenInput.value = "";

                isSending = false;

                contactSubmit.classList.remove("is-loading");
                contactForm.removeAttribute("aria-busy");

                if (submitLabel) {
                    submitLabel.textContent = originalLabel;
                }

                updateSubmitState();

            }

        });

        updateSubmitState();

    }
}
