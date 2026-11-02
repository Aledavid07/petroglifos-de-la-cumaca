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
  } catch (error) {
    console.error("Layout error:", error);
  }
}

loadLayout();