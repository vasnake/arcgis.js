// deprecated. using meapp.coffee now

console.log('meapp enter');

var vappFactory = null;
define(
    ["dojo/_base/declare", "dojo/dom", 'dojo/has',
    "vs/mpvlib"],
    function(declare, dom, has, mpvlib) {
        console.log('meapp dojo/define. define app classes');

        try {vslib.log('try vslib');} catch(ex) {vslib = new mpvlib();}


vslib.log('vs.mpvlib declare vappFactory');
vappFactory = {

constructor: function(args) {
    vslib.log('vs.meapp constructor');
    declare.safeMixin(this, args);
},


//Create menu of editor options
createEditorMenu : function createEditorMenu() {
    require(
        ["dijit/Menu",
        "dijit/MenuItem",
        "dijit/CheckedMenuItem",
        "dijit/MenuSeparator",
        "dijit/PopupMenuItem",
        "dojo/domReady!"],
        dojo.hitch(this, function(Menu, MenuItem, CheckedMenuItem, MenuSeparator, PopupMenuItem){
            this.log("createEditorMenu");

            // editor menu
            var menu = new dijit.DropDownMenu({
                style : "display: none;"
            });

            var menuItem = new dijit.MenuItem({
                label :     "Шаблоны",
                iconClass : "dijitIconSearch",
                onClick :   function() {
                    console.log("editor menu, templates menuitem onclick. ", arguments);
                    navigateStack('editPanel');
                }
            });
            menu.addChild(menuItem);

            // tables submenu
            var tabsmenu = new Menu();

            tabsmenu.addChild(new MenuItem({
                label:      "Отключающие устройства",
                iconClass : "dijitFolderOpened",
                onClick :   dojo.hitch(this, function() {
                    console.log("editor menu, table onclick. ", arguments);
                    this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/0");
                })
            }));

            tabsmenu.addChild(new MenuItem({
                label:      "СКЗ",
                iconClass : "dijitFolderOpened",
                onClick :   dojo.hitch(this, function() {
                    console.log("editor menu, table onclick. ", arguments);
                    this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/1");
                })
            }));

            tabsmenu.addChild(new MenuItem({
                label:      "Газопроводы",
                iconClass : "dijitFolderOpened",
                onClick :   dojo.hitch(this, function() {
                    console.log("editor menu, table onclick. ", arguments);
                    this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/2");
                })            }));

            tabsmenu.addChild(new MenuItem({
                label:      "ГРП",
                iconClass : "dijitFolderOpened",
                onClick :   dojo.hitch(this, function() {
                    console.log("editor menu, table onclick. ", arguments);
                    this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/3");
                })            }));

            menu.addChild(new PopupMenuItem({
                label:      "Таблицы",
                popup:      tabsmenu,
                iconClass : "dijitFolderOpened"
            }));

            // create dropdown button to display menu
            var menuButton = new dijit.form.DropDownButton({
                label :     "Редактирование",
                id :        'editorDropDownButton',
                title :     "Шаблоны, таблицы",
                dropDown :  menu,
                iconClass : "dijitFolderOpened"
            });
            menuButton.startup();

            dojo.byId('webmap-toolbar-left').appendChild(menuButton.domNode);
        }));
}, // createEditorMenu


//this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/0");
loadFCTable: function(fcUrl) {
    this.log("loadFCTable");
    console.debug("loadFCTable. fcUrl: ", arguments);
}, // loadFCTable


log: function(str, doalert) { // write app messages to log
    vslib.log("vs.meapp." + str, doalert);
} // log

}; // vlibFactory


        vslib.log('meapp dojo/declare vs.meapp');
        return declare("vs.meapp", null, vappFactory);
    }
); // define

console.log('meapp leave');
