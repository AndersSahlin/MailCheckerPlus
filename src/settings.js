/// <reference path="DB.js" />

var Settings = function() {

   var cache = {};
   var storeId = "settings";
   var prefix = "gc_";

   var defaults = {
      "poll": 15000,
      "dn_timeout": 15000,
      "language": "en",
      "sn_audio": "chime.mp3",
      "check_label": "",
      "open_label": "#inbox",
      "icon_set": "set1",
      "preview_setting": 2,
      "show_notification": true,
      "check_gmail_off": false,
      "hide_count": false,
      "sound_off": false,
      "show_notification": true,
      "showfull_read": false,
      "animate_off": false,
      "open_tabs": false,
      "no_mailto": false,
      "archive_read": true,
   };

   function loadFromDB(_settingsLoaded) {
      wrappedDB.readAllObjects(storeId,
      function (setting) {
         cache[setting.key] = setting.value;
      }, _settingsLoaded);
   }

   Settings.read = function (key) {
      if (cache[key] != null) {
         return cache[key];
      }

      // Key not found, store default value
      if (defaults[key] != null) {
         this.store(key, defaults[key]);
         return defaults[key];
      }

      return null;
   };

   Settings.store = function (key, value) {
      cache[key] = value;
      wrappedDB.putObject(storeId, key, value);
   };

   Settings.load = function (settingsLoaded) {
      wrappedDB.open(DBNAME, storeId, function () { loadFromDB(settingsLoaded); });
   };
}

Settings();