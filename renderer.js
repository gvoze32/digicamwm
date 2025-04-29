document.addEventListener("DOMContentLoaded", () => {
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
  const updateNotes = document.getElementById("update-notes");
  const closeUpdateBtn = document.getElementById("close-update-notification");
  const downloadUpdateBtn = document.getElementById("download-update");
  const remindLaterBtn = document.getElementById("remind-later");

  let currentReleaseUrl = "";
  let processing = false;
  let inputDir = "";
  let outputDir = "";
  let designs = [];
  let currentDesign = null;

  // Browse input folder
  browseInputBtn.addEventListener("click", async () => {
    const folder = await window.api.selectFolder("input");
    if (folder) {
      inputDir = folder;
      inputFolderInput.value = folder;
      checkStartEnabled();
    }
  });

  // Browse output folder
  browseOutputBtn.addEventListener("click", async () => {
    const folder = await window.api.selectFolder("output");
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
  window.api.onUpdateAvailable((data) => {
    updateVersion.textContent = data.version;
    updateNotes.textContent =
      data.releaseNotes?.slice(0, 300) || "Improvements and bug fixes.";
    if (data.releaseNotes?.length > 300) {
      updateNotes.textContent += "...";
    }
    currentReleaseUrl = data.releaseUrl;
    updateNotification.classList.remove("hidden");
  });

  // Close update notification
  closeUpdateBtn.addEventListener("click", () => {
    updateNotification.classList.add("hidden");
  });

  // Remind later button
  remindLaterBtn.addEventListener("click", () => {
    updateNotification.classList.add("hidden");
  });

  // Download update button
  downloadUpdateBtn.addEventListener("click", async () => {
    if (currentReleaseUrl) {
      await window.api.openExternalUrl(currentReleaseUrl);
      updateNotification.classList.add("hidden");
    }
  });

  // Load available designs
  async function loadDesigns() {
    designs = await window.api.getDesigns();
    const currentDesignInfo = await window.api.getCurrentDesign();

    // Store only the ID since the full design object can't be cloned
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

    // Update the design preview to show the current design
    updateDesignPreview(currentDesignInfo.id);
  }

  // Update design preview when selection changes
  function updateDesignPreview(designId) {
    const design = designs.find((d) => d.id === designId);
    if (!design) return;

    const designName = document.getElementById("design-name");
    const designDescription = document.getElementById("design-description");
    const landscapeThumbnail = document.getElementById(
      "design-thumbnail-landscape"
    );
    const portraitThumbnail = document.getElementById(
      "design-thumbnail-portrait"
    );

    designName.textContent = design.name;
    designDescription.textContent = design.description;

    // Update the thumbnail images - use the correct jpg file extension
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

  // Set up thumbnails for modal preview
  function setupThumbnailClickHandlers() {
    const thumbnails = document.querySelectorAll(".design-thumbnail");
    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener("click", function () {
        modal.style.display = "flex"; // Use flex to center content
        enlargedImage.src = this.getAttribute("data-fullsize");
        modalCaption.textContent = this.alt || "Design preview";

        // Disable scrolling on body when modal is open
        document.body.style.overflow = "hidden";

        // Add ESC key listener to close modal
        document.addEventListener("keydown", handleEscKey);
      });
    });
  }

  // Close modal when ESC key is pressed
  function handleEscKey(e) {
    if (e.key === "Escape") {
      closeModalFunc();
    }
  }

  // Function to close modal
  function closeModalFunc() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Re-enable scrolling
    document.removeEventListener("keydown", handleEscKey);
  }

  // Run setup after designs are loaded
  loadDesigns().then(() => {
    setupThumbnailClickHandlers();
  });

  // Close modal when clicking the X
  closeModal.addEventListener("click", closeModalFunc);

  // Close modal when clicking outside the image
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModalFunc();
    }
  });

  // Handle design selection change
  designSelector.addEventListener("change", async () => {
    const selectedDesignId = designSelector.value;
    await window.api.setDesign(selectedDesignId);
    // Only store the ID
    currentDesign = selectedDesignId;

    // Update the preview with the selected design
    updateDesignPreview(selectedDesignId);
  });

  // Initialize designs
  loadDesigns();

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

    // Get the photographer name
    const photographerName = photographerNameInput.value.trim();

    // Start processing with current design
    const result = await window.api.startProcessing({
      inputDir: inputDir,
      outputDir: outputDir,
      photographerName: photographerName,
    });

    if (!result.success) {
      progressText.textContent = `Error: ${result.message}`;
    }
  });

  // Handle process status updates
  window.api.onProcessStatus((data) => {
    switch (data.type) {
      case "start":
        progressText.textContent = `Processing ${data.total} images...`;
        progressCount.textContent = `0/${data.total}`;
        break;

      case "progress":
        const percent = (data.current / data.total) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Processing ${data.currentFile}...`;
        progressCount.textContent = `${data.current}/${data.total}`;
        break;

      case "complete":
        progressText.textContent = "Processing complete!";
        processing = false;
        checkStartEnabled();
        stopButton.disabled = true;
        break;
    }
  });

  // Handle image preview updates
  window.api.onImageProcessed((data) => {
    if (data.success) {
      // Update the preview with the latest processed image
      // We use a query parameter to force reload even if the path is the same
      const timestamp = new Date().getTime();
      previewImage.src = `file://${data.path}?t=${timestamp}`;
      currentFile.textContent = data.file;
    } else {
      console.error(`Error processing ${data.file}: ${data.error}`);
    }
  });

  // Clean up event listeners when window is closed
  window.addEventListener("beforeunload", () => {
    window.api.removeAllListeners();
  });
});
