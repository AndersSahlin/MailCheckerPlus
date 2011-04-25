/* IndexedDB wrapper */

/* 
   From: http://setthebarlow.com/indexeddb/ 
   (with modifications by Anders Sahlin for "Mail Checker Plus for Google Mail™")
*/

var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
 
if ('webkitIndexedDB' in window) {
   window.IDBTransaction = window.webkitIDBTransaction;
   window.IDBKeyRange = window.webkitIDBKeyRange;
}
 
var wrappedDB = {};
wrappedDB.db = null;
wrappedDB.opened = false;
 
wrappedDB.onerror = function(e) {
   console.error(e);
};
 
wrappedDB.open = function(dbName, storeId, callback) {
   var request = indexedDB.open(dbName);
 
   request.onsuccess = function(e) {
      var v = "1.1"; // Structural version of the DB
      wrappedDB.db = e.target.result;
      var db = wrappedDB.db;

      // We can only create Object stores in a setVersion transaction
      if(v!= db.version) {
         var setVrequest = db.setVersion(v);
 
         // onsuccess is the only place we can create Object Stores
         setVrequest.onfailure = wrappedDB.onerror;
         setVrequest.onsuccess = function(e) {
            if(db.objectStoreNames.contains(storeId)) {
               db.deleteObjectStore(storeId);
            }
 
            var store = db.createObjectStore(storeId, {keyPath: "key"}); // Create unique identifier for store
            wrappedDB.opened = true;
            callback();
         };
      }
      else {
         wrappedDB.opened = true;
         callback();
      }
   };
 
   request.onfailure = wrappedDB.onerror;
}
 
wrappedDB.putObject = function(storeId, key, value) {
   if(wrappedDB.opened === false)
      return;

   var db = wrappedDB.db;
   var trans = db.transaction([storeId], IDBTransaction.READ_WRITE, 0);
   
   trans.onabort = function(e) {
      console.error(e);
   };

   var store = trans.objectStore(storeId);
 
   var data = {
      "key": key,
      "value": value
   };
 
   var request = store.put(data);
 
   request.onsuccess = function(e) {
      console.log("Successfully stored object with key: " + key);
   };
    
   request.onerror = function(e) {
      console.error("An error occured while trying to store an object with key: " + key + ". " 
         + this.webkitErrorMessage + " (code " + this.errorCode + ")");
   };
};
 
wrappedDB.deleteSetting = function(storeId, key) {
   if(wrappedDB.opened === false)
      return;

   var db = wrappedDB.db;
   var trans = db.transaction([storeId], IDBTransaction.READ_WRITE, 0);
   var store = trans.objectStore(storeId);
 
   var request = store.delete(key);
 
   request.onsuccess = function(e) {
      console.log("Successfully deleted object with key: " + key);
   };
 
   request.onerror = function(e) {
      console.error("An error occured while trying to delete an object with key: " + key + ". " 
         + this.webkitErrorMessage + " (code " + this.errorCode + ")");
   };
};
 
wrappedDB.readAllObjects = function(storeId, objectFoundCallback, requestCompleteCallback) { 
   if(wrappedDB.opened === false)
      return;

   var db = wrappedDB.db;
   var trans = db.transaction([storeId], IDBTransaction.READ_WRITE, 0);
   var store = trans.objectStore(storeId);
 
   // Get everything in the store;
   var keyRange = IDBKeyRange.lowerBound(0);
   var cursorRequest = store.openCursor(keyRange);
 
   cursorRequest.onsuccess = function(e) {
      var cursor = e.target.result;

      if(!cursor) {
         if(requestCompleteCallback)
            requestCompleteCallback();
      } else { 
         if(objectFoundCallback)
            objectFoundCallback(cursor.value);

         cursor.continue();
      }
   };
 
   cursorRequest.onerror = wrappedDB.onerror;
};

wrappedDB.readObject = function(storeId, key, callback) { 
   if(wrappedDB.opened === false)
      return;

   var db = wrappedDB.db;
   var trans = db.transaction([storeId], IDBTransaction.READ_WRITE, 0);
   var store = trans.objectStore(storeId);
 
   // Get everything in the store;
   var request = store.get(key);
 
   request.onsuccess = function(e) {
      if(callback) {
         if(this.result) {
            callback(this.result.value);
         } else {
            callback(null); // TODO: Better error handling
         }
      }
   };
 
   request.onerror = wrappedDB.onerror;
};
