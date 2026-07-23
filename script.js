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