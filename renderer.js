import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

document.addEventListener("DOMContentLoaded", async () => {
  // Get elements
  const inputFolderInput = document.getElementById("input-folder");
  const outputFolderInput = document.getElementById("output-folder");
  const photographerNameInput = document.getElementById("photographer-name");
  const browseInputBtn = document.getElementById("browse-input");
  const browseOutputBtn = document.getElementById("browse-output");
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.querySelector(".progress-text");
  const progressCount = document.getElementById("progress-count");
  const previewImage = document.getElementById("preview-image");
  const currentFile = document.getElementById("current-file");
  const designSelector = document.getElementById("design-selector");

  // Update notification elements
  const updateNotification = document.getElementById("update-notification");
  const updateVersion = document.getElementById("update-version");
  const closeUpdateBtn = document.getElementById("close-update-notification");
  const downloadUpdateBtn = document.getElementById("download-update");

  let currentReleaseUrl = "";
  let processing = false;
  let inputDir = "";
  let outputDir = "";
  let designs = [];
  let currentDesign = null;

  // Store unlisten functions for cleanup
  const unlisteners = [];

  // Browse input folder
  browseInputBtn.addEventListener("click", async () => {
    const folder = await open({ directory: true, multiple: false });
    if (folder) {
      inputDir = folder;
      inputFolderInput.value = folder;
      checkStartEnabled();
    }
  });

  // Browse output folder
  browseOutputBtn.addEventListener("click", async () => {
    const folder = await open({ directory: true, multiple: false });
    if (folder) {
      outputDir = folder;
      outputFolderInput.value = folder;
      checkStartEnabled();
    }
  });

  // Enable start button only when both directories are selected
  function checkStartEnabled() {
    startButton.disabled = !(inputDir && outputDir && !processing);
  }

  // Handle update events
  const unlistenUpdate = await listen("update-available", (event) => {
    const data = event.payload;
    updateVersion.textContent = data.version;
    currentReleaseUrl = data.releaseUrl;
    updateNotification.classList.remove("hidden");
  });
  unlisteners.push(unlistenUpdate);

  // Close update notification
  closeUpdateBtn.addEventListener("click", () => {
    updateNotification.classList.add("hidden");
  });

  // Download update button
  downloadUpdateBtn.addEventListener("click", async () => {
    if (currentReleaseUrl) {
      await openUrl(currentReleaseUrl);
      updateNotification.classList.add("hidden");
    }
  });

  // Load available designs
  async function loadDesigns() {
    designs = await invoke("get_designs");
    const currentDesignInfo = await invoke("get_current_design");

    currentDesign = currentDesignInfo.id;

    // Populate design selector
    designSelector.innerHTML = "";
    designs.forEach((design) => {
      const option = document.createElement("option");
      option.value = design.id;
      option.textContent = design.name;
      designSelector.appendChild(option);
    });

    // Select current design
    designSelector.value = currentDesignInfo.id;

    // Update the design preview
    updateDesignPreview(currentDesignInfo.id);
  }

  // Update design preview when selection changes
  function updateDesignPreview(designId) {
    const design = designs.find((d) => d.id === designId);
    if (!design) return;

    const designName = document.getElementById("design-name");
    const designDescription = document.getElementById("design-description");
    const landscapeThumbnail = document.getElementById(
      "design-thumbnail-landscape",
    );
    const portraitThumbnail = document.getElementById(
      "design-thumbnail-portrait",
    );

    designName.textContent = design.name;
    designDescription.textContent = design.description;

    const landscapeImagePath = `assets/designs/${design.id}-landscape.jpg`;
    const portraitImagePath = `assets/designs/${design.id}-portrait.jpg`;

    landscapeThumbnail.src = landscapeImagePath;
    landscapeThumbnail.setAttribute("data-fullsize", landscapeImagePath);
    landscapeThumbnail.alt = `${design.name} landscape example`;

    portraitThumbnail.src = portraitImagePath;
    portraitThumbnail.setAttribute("data-fullsize", portraitImagePath);
    portraitThumbnail.alt = `${design.name} portrait example`;
  }

  // Modal functionality
  const modal = document.getElementById("image-preview-modal");
  const enlargedImage = document.getElementById("enlarged-image");
  const modalCaption = document.getElementById("modal-caption");
  const closeModal = document.querySelector(".close-modal");

  function setupThumbnailClickHandlers() {
    const thumbnails = document.querySelectorAll(".design-thumbnail");
    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener("click", function () {
        modal.style.display = "flex";
        enlargedImage.src = this.getAttribute("data-fullsize");
        modalCaption.textContent = this.alt || "Design preview";
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleEscKey);
      });
    });
  }

  function handleEscKey(e) {
    if (e.key === "Escape") {
      closeModalFunc();
    }
  }

  function closeModalFunc() {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    document.removeEventListener("keydown", handleEscKey);
  }

  // Load designs and setup
  await loadDesigns();
  setupThumbnailClickHandlers();

  closeModal.addEventListener("click", closeModalFunc);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModalFunc();
    }
  });

  // Handle design selection change
  designSelector.addEventListener("change", async () => {
    const selectedDesignId = designSelector.value;
    await invoke("set_design", { designId: selectedDesignId });
    currentDesign = selectedDesignId;
    updateDesignPreview(selectedDesignId);
  });

  // Start processing
  startButton.addEventListener("click", async () => {
    if (!inputDir || !outputDir) return;

    processing = true;
    startButton.disabled = true;
    stopButton.disabled = false;

    // Reset UI
    progressBar.style.width = "0%";
    progressText.textContent = "Starting...";
    progressCount.textContent = "0/0";

    const photographerName = photographerNameInput.value.trim();

    const result = await invoke("start_processing", {
      inputDir: inputDir,
      outputDir: outputDir,
      photographerName: photographerName,
    });

    if (!result.success) {
      progressText.textContent = `Error: ${result.message}`;
    }
  });

  // Handle process status updates
  const unlistenStatus = await listen("process-status", (event) => {
    const data = event.payload;
    switch (data.type) {
      case "start":
        progressText.textContent = `Processing ${data.total} images...`;
        progressCount.textContent = `0/${data.total}`;
        break;

      case "progress": {
        const percent = (data.current / data.total) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Processing ${data.currentFile}...`;
        progressCount.textContent = `${data.current}/${data.total}`;
        break;
      }

      case "complete":
        progressText.textContent = "Processing complete!";
        processing = false;
        checkStartEnabled();
        stopButton.disabled = true;
        break;
    }
  });
  unlisteners.push(unlistenStatus);

  // Handle image preview updates
  const unlistenImage = await listen("image-processed", (event) => {
    const data = event.payload;
    if (data.success && data.path) {
      const assetUrl = convertFileSrc(data.path);
      previewImage.src = assetUrl;
      currentFile.textContent = data.file;
    } else {
      console.error(`Error processing ${data.file}: ${data.error}`);
    }
  });
  unlisteners.push(unlistenImage);

  // Clean up event listeners when window is closed
  window.addEventListener("beforeunload", () => {
    unlisteners.forEach((unlisten) => unlisten());
  });
});
