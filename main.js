const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { addWatermarkFrame, processBulkImages } = require("./index");
const { getDesignList, getDesignById, defaultDesign } = require("./designs");

let mainWindow;
let currentDesignId = defaultDesign;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, "assets/icons/digicamwm.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");

  // Check for updates after window is created
  checkForUpdates();
}

function checkForUpdates() {
  const currentVersion = app.getVersion();
  const options = {
    hostname: "api.github.com",
    path: "/repos/gvoze32/digicamwm/releases/latest",
    method: "GET",
    headers: {
      "User-Agent": "DigiCamWM Update Checker",
    },
  };

  const req = https.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const release = JSON.parse(data);
        // Strip the 'v' prefix if it exists
        const latestVersion = release.tag_name.replace(/^v/, "");

        // Compare versions
        if (isNewerVersion(latestVersion, currentVersion)) {
          mainWindow.webContents.send("update-available", {
            version: latestVersion,
            releaseUrl: release.html_url,
          });
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Error checking for updates:", error);
  });

  req.end();

  // Check for updates every 6 hours
  setTimeout(checkForUpdates, 6 * 60 * 60 * 1000);
}

// Version comparison helper (returns true if latestVersion > currentVersion)
function isNewerVersion(latestVersion, currentVersion) {
  const latest = latestVersion.split(".").map(Number);
  const current = currentVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(latest.length, current.length); i++) {
    const latestPart = latest[i] || 0;
    const currentPart = current[i] || 0;

    if (latestPart > currentPart) {
      return true;
    }
    if (latestPart < currentPart) {
      return false;
    }
  }

  return false; // Versions are equal
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

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

// Handle opening external URLs (for update download)
ipcMain.handle("open-external-url", async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle("get-designs", async () => {
  return getDesignList();
});

ipcMain.handle("set-design", async (event, designId) => {
  currentDesignId = designId;
  return { success: true, designId };
});

ipcMain.handle("get-current-design", async () => {
  const design = getDesignById(currentDesignId);
  return {
    id: design.id,
    name: design.name,
    description: design.description,
    thumbnailPath: design.thumbnailPath,
  };
});

ipcMain.handle(
  "start-processing",
  async (event, { inputDir, outputDir, photographerName }) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const files = fs.readdirSync(inputDir);
      const imageExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".webp"];
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });

      mainWindow.webContents.send("process-status", {
        type: "start",
        total: imageFiles.length,
      });

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);

        mainWindow.webContents.send("process-status", {
          type: "progress",
          current: i + 1,
          currentFile: file,
          total: imageFiles.length,
        });

        try {
          await addWatermarkFrame(
            inputPath,
            outputPath,
            currentDesignId,
            photographerName
          );

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

      mainWindow.webContents.send("process-status", { type: "complete" });
      return {
        success: true,
        message: `Processed ${imageFiles.length} images`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
);
