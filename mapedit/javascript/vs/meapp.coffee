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


            geometryCenter: (geom) -> # returns {point, extent} as center of input geometry and input geometry Extent
                this.log "geometryCenter"
                console.debug "geometryCenter. input: ", arguments
                res = {point: null, extent: null}
                fig = null

                res.point = new esri.geometry.Point(geom) if geom.type is 'point'
                fig = new esri.geometry.Polygon(geom) if geom.type is 'polygon'
                fig = new esri.geometry.Polyline(geom) if geom.type is 'polyline'

                if fig isnt null
                    res.extent = fig.getExtent()
                    res.point = res.extent.getCenter()
                # console.debug "geometryCenter. center, extent: ", res
                res
            # geometryCenter: (geom) ->


            # this.loadFCTable("http://cgis.allgis.org/arcgis/rest/services/edit_Газовая_сеть/FeatureServer/0");
            loadFCTable: (fcUrl, fcName = 'n/a') ->
                this.log("loadFCTable")
                console.debug("loadFCTable. fcUrl: ", arguments)
                dojo.byId('fsEndpoint').value = fcUrl
                dijit.byId('bottomPaneTableName')?.set("label", "Закрыть таблицу '#{fcName}'")

                featureEditor.onZoomToCurrentRecord = (featureInfo) ->
                    # featureInfo is {currentRecord feature data}; this is featureEditor
                    console.log("meapp.FCT.onZoomToCurrentRecord. featureInfo, this: ", arguments, this)
                    center = vsapp.geometryCenter featureInfo.feature.geometry
                    if center.extent isnt null then defer = map.setExtent center.extent, true
                    if center.extent is null then defer = map.centerAndZoom center.point, map.getMaxScale()
                    defer.then () ->
                        console.log("onZoomToCurrentRecord complete", arguments, center)

                showAttribsTable()
            # loadFCTable: (fcUrl, fcName = '') ->


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

                        # create dropdown button to display menu
                        menuButton = new dijit.form.DropDownButton {
                            label :     "Атрибутика",
                            id :        'editorDropDownButton',
                            title :     "Таблицы",
                            dropDown :  tabsmenu,
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
