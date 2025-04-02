document.addEventListener("DOMContentLoaded", () => {
  // Get elements
  const inputFolderInput = document.getElementById("input-folder");
  const outputFolderInput = document.getElementById("output-folder");
  const browseInputBtn = document.getElementById("browse-input");
  const browseOutputBtn = document.getElementById("browse-output");
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.querySelector(".progress-text");
  const progressCount = document.getElementById("progress-count");
  const previewImage = document.getElementById("preview-image");
  const currentFile = document.getElementById("current-file");

  let processing = false;
  let inputDir = "";
  let outputDir = "";

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

    // Start processing
    const result = await window.api.startProcessing({
      inputDir: inputDir,
      outputDir: outputDir,
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
