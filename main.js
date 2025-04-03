const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { addWatermarkFrame, processBulkImages } = require("./index");
const { getDesignList, getDesignById, defaultDesign } = require("./designs");

// Keep a global reference of the window object
let mainWindow;
let currentDesignId = defaultDesign;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, "assets/icons/digicamwm.png"), // Add application icon
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the index.html file
  mainWindow.loadFile("index.html");

  // Open DevTools (comment out for production)
  // mainWindow.webContents.openDevTools();
}

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// Handle folder selection dialog
ipcMain.handle("select-folder", async (event, purpose) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

// Handle getting available designs
ipcMain.handle("get-designs", async () => {
  return getDesignList();
});

// Handle setting current design
ipcMain.handle("set-design", async (event, designId) => {
  currentDesignId = designId;
  return { success: true, designId };
});

// Handle getting current design
ipcMain.handle("get-current-design", async () => {
  // Return only the serializable properties, not the full design object with functions
  const design = getDesignById(currentDesignId);
  return {
    id: design.id,
    name: design.name,
    description: design.description,
    thumbnailPath: design.thumbnailPath,
  };
});

// Handle starting the watermark process
ipcMain.handle("start-processing", async (event, { inputDir, outputDir }) => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Get image files
    const files = fs.readdirSync(inputDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".webp"];
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // Send total count to the renderer
    mainWindow.webContents.send("process-status", {
      type: "start",
      total: imageFiles.length,
    });

    // Process images one by one
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);

      // Update progress
      mainWindow.webContents.send("process-status", {
        type: "progress",
        current: i + 1,
        currentFile: file,
        total: imageFiles.length,
      });

      // Process the image with the selected design
      try {
        await addWatermarkFrame(inputPath, outputPath, currentDesignId);

        // Send preview of processed image
        const previewPath = outputPath;
        mainWindow.webContents.send("image-processed", {
          success: true,
          path: previewPath,
          file: file,
        });
      } catch (error) {
        mainWindow.webContents.send("image-processed", {
          success: false,
          file: file,
          error: error.message,
        });
      }
    }

    // Complete
    mainWindow.webContents.send("process-status", { type: "complete" });
    return { success: true, message: `Processed ${imageFiles.length} images` };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
