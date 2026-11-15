async function loadLayout() {
  try {
    const layoutEl = document.getElementById("layout");
    const layoutFile = layoutEl.dataset.layout || "components/layout.html";

    const response = await fetch(layoutFile);
    if (!response.ok) {
      throw new Error("Could not load " + layoutFile + " (status " + response.status + ")");
    }
    layoutEl.innerHTML = await response.text();

    const content = document.getElementById("page-content");
    const slot = document.getElementById("slot");
    if (!slot) {
      throw new Error("There is no element with id='slot' in " + layoutFile);
    }
    slot.appendChild(content.content.cloneNode(true));
    initImagePreview(slot);
  } catch (error) {
    console.error("Layout error:", error);
  }
}

loadLayout();


/* ---------------------------------------------------------------
   Image preview: click an image in the page content to see it large.
   - Images inside links (e.g. the thumbnails on the station pages)
     are skipped, so those links keep working.
   - Add data-no-preview to any <img> that should not open a preview.
   - Close with the X button, a click anywhere else, or Escape.
   - Left / right arrows (buttons or keyboard) move between the
     previewable images on the page.
   --------------------------------------------------------------- */
function initImagePreview(root) {
  const images = Array.from(root.querySelectorAll("img")).filter(
    (img) => !img.closest("a") && !img.hasAttribute("data-no-preview")
  );
  if (images.length === 0) return;

  let box = null;       // the overlay (built the first time it is needed)
  let current = -1;     // index of the image being shown
  let opener = null;    // element to give focus back to on close

  function build() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Vista previa de la imagen");
    box.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Cerrar">&times;</button>' +
      '<button type="button" class="lightbox-nav lightbox-prev" aria-label="Imagen anterior">&#8249;</button>' +
      '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" alt="">' +
      '<figcaption class="lightbox-caption"></figcaption>' +
      "</figure>" +
      '<button type="button" class="lightbox-nav lightbox-next" aria-label="Imagen siguiente">&#8250;</button>';
    document.body.appendChild(box);

    box.querySelector(".lightbox-close").addEventListener("click", close);
    box.querySelector(".lightbox-prev").addEventListener("click", () => show(current - 1));
    box.querySelector(".lightbox-next").addEventListener("click", () => show(current + 1));

    // a click anywhere except on the buttons closes it
    box.addEventListener("click", (e) => {
      if (!e.target.closest("button")) close();
    });

    document.addEventListener("keydown", onKey);
  }

  function show(index) {
    current = (index + images.length) % images.length;
    const source = images[current];
    const big = box.querySelector(".lightbox-img");
    const caption = box.querySelector(".lightbox-caption");

    big.src = source.currentSrc || source.src;
    big.alt = source.alt;
    caption.textContent = source.alt;
    caption.hidden = !source.alt;

    const single = images.length === 1;
    box.querySelector(".lightbox-prev").hidden = single;
    box.querySelector(".lightbox-next").hidden = single;
  }

  function open(index) {
    if (!box) build();
    opener = document.activeElement;
    show(index);
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";   // stop the page scrolling behind
    box.querySelector(".lightbox-close").focus();
  }

  function close() {
    box.hidden = true;
    document.documentElement.style.overflow = "";
    if (opener && opener.focus) opener.focus();
  }

  function onKey(e) {
    if (!box || box.hidden) return;
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowLeft" && images.length > 1) {
      show(current - 1);
    } else if (e.key === "ArrowRight" && images.length > 1) {
      show(current + 1);
    } else if (e.key === "Tab") {
      // keep keyboard focus inside the overlay while it is open
      const buttons = Array.from(box.querySelectorAll("button")).filter((b) => !b.hidden);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  images.forEach((img, index) => {
    img.classList.add("previewable");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", "Ampliar imagen" + (img.alt ? ": " + img.alt : ""));
    img.addEventListener("click", () => open(index));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(index);
      }
    });
  });
}