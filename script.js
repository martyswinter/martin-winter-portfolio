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

// ===== Workflow carousel =====
(() => {
    // Společná obsluha swipu
    function enableSwipe(element, onSwipe, isEnabled = () => true) {
        let touchStart = null;
        let suppressClickUntil = 0;

        element.addEventListener('touchstart', event => {
            if (!isEnabled() || event.touches.length !== 1) {
                touchStart = null;
                return;
            }

            const touch = event.touches[0];

            touchStart = {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY
            };
        }, { passive: true });

        element.addEventListener('touchend', event => {
            if (!touchStart) return;

            const touch = [...event.changedTouches].find(
                item => item.identifier === touchStart.id
            );

            if (!touch) return;

            const dx = touch.clientX - touchStart.x;
            const dy = touch.clientY - touchStart.y;

            touchStart = null;

            if (
                !isEnabled() ||
                Math.abs(dx) < 50 ||
                Math.abs(dx) < Math.abs(dy) * 1.5
            ) {
                return;
            }

            // Zabránit kliknutí vyvolanému po swipu
            suppressClickUntil = Date.now() + 500;

            onSwipe(dx < 0 ? 1 : -1);
        }, { passive: true });

        element.addEventListener('touchcancel', () => {
            touchStart = null;
        }, { passive: true });

        element.addEventListener('click', event => {
            if (
                event.detail > 0 &&
                Date.now() < suppressClickUntil
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, { capture: true });
    }


    function animateSlide(element, direction) {
        if (
            !element ||
            !direction ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        element.getAnimations().forEach(animation => animation.cancel());

        element.animate(
            [
                {
                    transform: `translateX(${direction * 48}px)`,
                    opacity: 0.4
                },
                {
                    transform: 'translateX(0)',
                    opacity: 1
                }
            ],
            {
                duration: 380,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }
        );
    }

    function initWorkflowCarousels() {
        const carousels = [
            ...document.querySelectorAll('[data-workflow-carousel]')
        ].filter(element => !element.dataset.workflowReady);

        if (!carousels.length) return;

        // Společný náhled mimo accordion
        let dialog = document.querySelector('[data-workflow-lightbox]');

        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.className = 'workflow-lightbox';
            dialog.dataset.workflowLightbox = '';

            dialog.setAttribute(
                'aria-label',
                'Enlarged workflow screenshot'
            );

            dialog.innerHTML = `
                <div class="workflow-lightbox-header">
                    <button
                        class="contact-modal-close workflow-lightbox-close"
                        type="button"
                        aria-label="Close image"
                        autofocus
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24"
                            fill="none" aria-hidden="true">
                            <path
                                d="M6 6L18 18M18 6L6 18"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>
                <div class="workflow-lightbox-view"><img alt=""></div>
                <p class="workflow-lightbox-caption"></p>
                <div class="workflow-lightbox-controls">
                    <button class="workflow-lightbox-arrow" data-preview-prev type="button" aria-label="Previous screenshot">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 6 9 12 15 18" /></svg>
                    </button>
                    <div class="workflow-lightbox-dots" role="group" aria-label="Choose screenshot"></div>
                    <button class="workflow-lightbox-arrow" data-preview-next type="button" aria-label="Next screenshot">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6" /></svg>
                    </button>
                </div>
            `;

            document.body.append(dialog);
        }

        const largeImage = dialog.querySelector('img');
        const largeCaption = dialog.querySelector(
            '.workflow-lightbox-caption'
        );
        const closeButton = dialog.querySelector(
            '.workflow-lightbox-close'
        );

        const previewPrevious = dialog.querySelector('[data-preview-prev]');
        const previewNext = dialog.querySelector('[data-preview-next]');
        const previewDotsContainer = dialog.querySelector('.workflow-lightbox-dots');
        const previewView = dialog.querySelector('.workflow-lightbox-view');
        let previewDots = [];

        previewPrevious.addEventListener('click', () => movePreview(-1));
        previewNext.addEventListener('click', () => movePreview(1));

        function buildPreviewDots() {
            previewDotsContainer.replaceChildren();
            previewDots = activePreview.slides.map((slide, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'workflow-dot';
                dot.setAttribute('aria-label', `Show screenshot ${i + 1} of ${activePreview.slides.length}`);
                dot.addEventListener('click', () => {
                    activePreview.show(i);
                    renderPreview(slide);
                });
                previewDotsContainer.append(dot);
                return dot;
            });
        }

        let opener = null;
        let savedOverflow = '';
        let activePreview = null;

        // Nastavení obrázku a popisku v náhledu
        function renderPreview(slide) {
            const button = slide.querySelector(
                '.workflow-image-button'
            );
            const img = button.querySelector('img');

            largeImage.src =
                img.dataset.full || img.currentSrc || img.src;

            largeImage.alt = img.alt;

            largeCaption.textContent =
                slide.querySelector('figcaption')?.textContent ||
                img.alt;

            opener = button;
            const currentIndex = activePreview.getIndex();
            previewPrevious.disabled = currentIndex === 0;
            previewNext.disabled = currentIndex === activePreview.slides.length - 1;
            previewDots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === currentIndex)));
        }

        // Přepínání obrázků při otevřeném náhledu
        function movePreview(direction) {
            if (!dialog.open || !activePreview) return;

            const { slides, show, getIndex } = activePreview;

            const currentIndex = getIndex();
            const nextIndex = Math.max(
                0,
                Math.min(
                    slides.length - 1,
                    currentIndex + direction
                )
            );

            if (nextIndex === currentIndex) return;

            show(nextIndex);
            renderPreview(slides[nextIndex]);

            animateSlide(previewView, direction);
        }

        closeButton.addEventListener('click', () => {
            dialog.close();
        });

        // Zavření kliknutím mimo dialog
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;

            const rect = dialog.getBoundingClientRect();

            if (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
            ) {
                dialog.close();
            }
        });

        // Escape a focus trap zajišťuje nativní dialog
        dialog.addEventListener('close', () => {
            document.body.style.overflow = savedOverflow;

            largeImage.removeAttribute('src');
            largeImage.alt = '';
            largeCaption.textContent = '';

            activePreview = null;

            opener?.focus({ preventScroll: true });
            opener = null;
        });

        // Klávesnice ve zvětšeném náhledu
        dialog.addEventListener('keydown', event => {
            if (
                event.key !== 'ArrowLeft' &&
                event.key !== 'ArrowRight'
            ) {
                return;
            }

            event.preventDefault();

            movePreview(event.key === 'ArrowRight' ? 1 : -1);
        });

        // Swipe ve zvětšeném náhledu
        enableSwipe(
            previewView,
            movePreview,
            () => dialog.open
        );

        carousels.forEach(carousel => {
            const slides = [
                ...carousel.querySelectorAll('.workflow-slide')
            ];

            if (!slides.length) return;

            carousel.dataset.workflowReady = 'true';

            const previous = carousel.querySelector(
                '[data-workflow-prev]'
            );
            const next = carousel.querySelector(
                '[data-workflow-next]'
            );
            const dotsContainer = carousel.querySelector(
                '.workflow-dots'
            );
            const stage = carousel.querySelector(
                '.workflow-stage'
            );

            let index = 0;
            const dots = [];

            function updateAccordion() {
                const tile = carousel.closest('.expansive-tile');
                const body = tile?.querySelector('.tile-body');

                if (
                    body &&
                    tile.classList.contains('expanded')
                ) {
                    body.style.maxHeight = `${body.scrollHeight}px`;
                }
            }

            function show(newIndex) {
                const previousIndex = index;
                index = Math.max(
                    0,
                    Math.min(slides.length - 1, newIndex)
                );

                slides.forEach((slide, i) => {
                    slide.hidden = i !== index;
                });

                dots.forEach((dot, i) => {
                    dot.setAttribute(
                        'aria-current',
                        String(i === index)
                    );
                });

                if (previous) {
                    previous.disabled = index === 0;
                }

                if (next) {
                    next.disabled = index === slides.length - 1;
                }

                requestAnimationFrame(updateAccordion);

                animateSlide(
                    stage,
                    Math.sign(index - previousIndex)
                );
            }

            slides.forEach((slide, i) => {
                // Tečky
                const dot = document.createElement('button');

                dot.type = 'button';
                dot.className = 'workflow-dot';

                dot.setAttribute(
                    'aria-label',
                    `Show screenshot ${i + 1} of ${slides.length}`
                );

                dot.addEventListener('click', () => show(i));

                dotsContainer?.append(dot);
                dots.push(dot);

                // Otevření zvětšeného náhledu
                const button = slide.querySelector(
                    '.workflow-image-button'
                );
                const img = button.querySelector('img');

                button.addEventListener('click', () => {
                    activePreview = {
                        slides,
                        show,
                        getIndex: () => index
                    };

                    savedOverflow = document.body.style.overflow;

                    buildPreviewDots();
                    renderPreview(slide);

                    dialog.showModal();
                    document.body.style.overflow = 'hidden';
                });

                img.addEventListener('load', updateAccordion);
            });

            // Šipky carouselu
            previous?.addEventListener('click', () => {
                show(index - 1);
            });

            next?.addEventListener('click', () => {
                show(index + 1);
            });

            // Klávesnice v carouselu
            carousel.addEventListener('keydown', event => {
                if (
                    event.key !== 'ArrowLeft' &&
                    event.key !== 'ArrowRight'
                ) {
                    return;
                }

                event.preventDefault();

                show(
                    index +
                    (event.key === 'ArrowRight' ? 1 : -1)
                );
            });

            // Swipe v carouselu pouze na mobilu
            if (stage) {
                enableSwipe(
                    stage,
                    direction => show(index + direction),
                    () => window.matchMedia(
                        '(max-width: 767px)'
                    ).matches
                );
            }

            // Přepočet výšky otevřeného accordione
            if ('ResizeObserver' in window) {
                const observer = new ResizeObserver(
                    updateAccordion
                );

                observer.observe(carousel);
            }

            show(0);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initWorkflowCarousels,
            { once: true }
        );
    } else {
        initWorkflowCarousels();
    }
})();