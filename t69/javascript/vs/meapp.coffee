###
Mapedit app classes.
Author: vasnake@gmail.com
###
console.log "meapp enter"

if vappFactory?
    alert "vappFactory defined already!"
else
    vappFactory = {}

define(["dojo/_base/declare", "dojo/dom", 'dojo/has', "vs/mpvlib"],
    (declare, dom, has, mpvlib) ->
        console.log 'meapp dojo/define. define app classes'
        try
            vslib.log('try vslib')
        catch
            window.vslib = new mpvlib()

        vslib.log('vs.mpvlib declare vappFactory')
        vappFactory = { # meapp object factory
        # used as: require(["vs/obj/meapp"], function(meapp) { vsapp = new meapp(); ...

            constructor: (args) ->
                vslib.log('vs.meapp constructor')
                declare.safeMixin(this, args)


            log: (str, doalert) ->  # write app messages to log
                vslib.log("vs.meapp.#{str}", doalert);


            # this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/0");
            loadFCTable: (fcUrl, fcName = '') ->
                this.log("loadFCTable")
                console.debug("loadFCTable. fcUrl: ", arguments)


            # Create editor menu
            createEditorMenu : () ->
                require(
                    ["dijit/Menu",
                    "dijit/MenuItem",
                    "dijit/CheckedMenuItem",
                    "dijit/MenuSeparator",
                    "dijit/PopupMenuItem",
                    "dojo/domReady!"],
                    dojo.hitch(this,
                    (Menu, MenuItem, CheckedMenuItem, MenuSeparator, PopupMenuItem) ->
                        this.log("createEditorMenu")

                        # tables submenu
                        subdata = [
                            {label: "Отключающие устройства", url: "http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/0"},
                            {label: "СКЗ", url: "http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/1"},
                            {label: "Газопроводы", url: "http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/2"},
                            {label: "ГРП", url: "http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/3"}
                        ]
                        self = this

                        tabsmenu = new Menu
                        tabsmenu.addChild new MenuItem {
                            label:      sd.label,
                            iconClass : "dijitFolderOpened",
                            fClassUrl:  sd.url,
                            onClick :   () ->
                                console.log("editor menu, table menuitem onclick. ", arguments)
                                self.loadFCTable(this.fClassUrl, this.label)
                        } for sd, idx in subdata

                        # editor menu
                        menu = new dijit.DropDownMenu { style : "display: none;" }
                        menu.addChild MenuItem {
                            label :     "Шаблоны",
                            iconClass : "dijitIconSearch",
                            onClick :   () ->
                                console.log("editor menu, templates menuitem onclick. ", arguments)
                                navigateStack('editPanel')
                        }

                        menu.addChild new PopupMenuItem {
                            label:      "Таблицы",
                            popup:      tabsmenu,
                            iconClass : "dijitFolderOpened"
                        }

                        # create dropdown button to display menu
                        menuButton = new dijit.form.DropDownButton {
                            label :     "Редактирование",
                            id :        'editorDropDownButton',
                            title :     "Шаблоны, таблицы",
                            dropDown :  menu,
                            iconClass : "dijitFolderOpened"
                        }
                        menuButton.startup
                        dojo.byId('webmap-toolbar-left').appendChild(menuButton.domNode)
                    ) # dojo.hitch
                ) # require
            # createEditorMenu

        } # vappFactory

        vslib.log('meapp dojo/declare vs.meapp')
        # return from define
        declare("vs.meapp", null, vappFactory)
    # define inner function
) # dojo/define

console.log "meapp leave"
