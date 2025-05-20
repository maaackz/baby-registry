const APP_ROOT_FOLDER = "ZhaninBabyRegistry";

function _incrementPurchased(itemId) {
  try {
    let appFolderIterator = DriveApp.getFoldersByName(APP_ROOT_FOLDER);
    if (!appFolderIterator.hasNext()) {
      throw new Error(`Folder '${APP_ROOT_FOLDER}' not found`);
    }
    let appFolder = appFolderIterator.next();

    let sheetFileIterator = appFolder.getFilesByName("Items");
    if (!sheetFileIterator.hasNext()) {
      throw new Error(`Spreadsheet 'Items' not found`);
    }
    let sheetFile = sheetFileIterator.next();

    let spreadsheet = SpreadsheetApp.open(sheetFile);
    let sheet = spreadsheet.getSheets()[0];
    let data = sheet.getDataRange().getValues();

    // Find row by ID in column A (index 0)
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        rowIndex = i + 1; // +1 for 1-based indexing
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    // Column C (index 2) holds the "purchased" count
    let purchasedCell = sheet.getRange(rowIndex, 3);
    let currentValue = purchasedCell.getValue();

    if (isNaN(currentValue) || currentValue === "") {
      currentValue = 0;
    }

    purchasedCell.setValue(currentValue + 1);

    return { status: "success", message: `Purchased count for item ${itemId} incremented.` };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

function _decrementPurchased(itemId) {
  try {
    let appFolderIterator = DriveApp.getFoldersByName(APP_ROOT_FOLDER);
    if (!appFolderIterator.hasNext()) {
      throw new Error(`Folder '${APP_ROOT_FOLDER}' not found`);
    }
    let appFolder = appFolderIterator.next();

    let sheetFileIterator = appFolder.getFilesByName("Items");
    if (!sheetFileIterator.hasNext()) {
      throw new Error(`Spreadsheet 'Items' not found`);
    }
    let sheetFile = sheetFileIterator.next();

    let spreadsheet = SpreadsheetApp.open(sheetFile);
    let sheet = spreadsheet.getSheets()[0];
    let data = sheet.getDataRange().getValues();

    // Find row by ID in column A (index 0)
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        rowIndex = i + 1; // +1 for 1-based indexing
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    // Column C (index 2) holds the "purchased" count
    let purchasedCell = sheet.getRange(rowIndex, 3);
    let currentValue = purchasedCell.getValue();

    if (isNaN(currentValue) || currentValue === "") {
      currentValue = 0;
    }

    if (currentValue > 0) {
      purchasedCell.setValue(currentValue - 1);
      return { status: "success", message: `Purchased count for item ${itemId} decremented.` };
    } else {
      return { status: "error", message: `Purchased count for item ${itemId} is already zero.` };
    }
  } catch (err) {
    return { status: "error", message: err.message };
  }
}


/**
 * CORS preflight support
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    // .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * GET handler for testing (e.g. ?itemId=3)
 */
function doGet(e) {
  const itemIdParam = e.parameter.itemId;
  const action = e.parameter.action;

  if (itemIdParam && action) {
    let itemId = Number(itemIdParam);
    if (isNaN(itemId)) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid itemId" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let result;
    if (action === "increment") {
      result = _incrementPurchased(itemId);
    } else if (action === "decrement") {
      result = _decrementPurchased(itemId);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid action" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: return all items list
  const sheet = DriveApp.getFoldersByName(APP_ROOT_FOLDER).next().getFilesByName("Items").next();
  const data = SpreadsheetApp.open(sheet).getSheets()[0].getDataRange().getValues();

  const headers = data[1]; // second row is actual headers
  const items = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    let item = {};
    for (let j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    items.push(item);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ items }))
    .setMimeType(ContentService.MimeType.JSON);
}



function _getAllItems() {
  const sheet = DriveApp.getFoldersByName(APP_ROOT_FOLDER).next().getFilesByName("Items").next();
  const data = SpreadsheetApp.open(sheet).getSheets()[0].getDataRange().getValues();

  const headers = data[0];
  return data.slice(1).map(row => {
    let item = {};
    headers.forEach((h, i) => item[h] = row[i]);
    return item;
  });
}


/**
 * POST handler for API calls (if you want)
 */
function doPost(e) {
  try {
    let itemId;
    if (e.postData && e.postData.contents) {
      let data = JSON.parse(e.postData.contents);
      itemId = data.itemId;
    }
    if (!itemId) throw new Error("Missing itemId parameter");
    itemId = Number(itemId);
    if (isNaN(itemId)) throw new Error("Invalid itemId parameter");

    let result = _incrementPurchased(itemId);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      // .setHeader("Access-Control-Allow-Origin", "*");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
      // .setHeader("Access-Control-Allow-Origin", "*");
  }
}
