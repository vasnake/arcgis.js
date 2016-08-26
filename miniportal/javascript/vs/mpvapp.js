console.log('vs.mpvapp enter');

// https://developers.arcgis.com/en/javascript/jshelp/inside_esri_request.html
require(["esri/config"], function(esriConfig) {
    esriConfig.defaults.io.corsEnabledServers.push("vdesk.algis.com:5000");
    esriConfig.defaults.io.corsEnabledServers.push("vdesk.algis.com");
});


var vlibFactory = null;
define(
    ["dojo/_base/declare", 'dojo/_base/array',
    "vs/mpvlib", "vs/dijit/tvlib", 'vs/dijit/agsdir'],
    function(declare, array, mpvlib, tvlib, agsdir) {

        try {vslib.log('vs.mpvapp try vslib');} catch(ex) {vslib = new mpvlib();}

vslib.log('vs.mpvapp declare vlibFactory');
vlibFactory = {

constructor: function(args) {
    vslib.log('vs.mpvapp constructor');
    declare.safeMixin(this, args);
    this.handler_onLayerAddResult = null; // handler_onLayerAddResult = map.on("layer-add-result", func_onLayerAddResult);
}, // constructor


// add AGS layer to map
//    var sett = {
//        url:            layer.url,
//        id:             layer.id,
//        visible:        layer.visible,
//        visSublayers:   vsub
//    };
addAGSLayer: function(layerURL, sett) {
    // define layer type (maplayer tiled, maplayer dynamic, featurelayer)
    // create new layer object
    // add layer to map
    // update legend
    this.log('addAGSLayer, layerURL: ' + layerURL);
    var layerID = vslib.getLayerID(layerURL);
    this.log('addAGSLayer, layerID: ' + layerID);

    // add map.onLayerAddResult event processor

    //https://developers.arcgis.com/en/javascript/jssamples/widget_legend.html
    //dojo.connect(map, 'onLayersAddResult', function (evt) {});
    if (this.handler_onLayerAddResult) {
        this.log('addAGSLayer, handler_onLayerAddResult defined already');
    } else {
        this.log('addAGSLayer, set handler_onLayerAddResult');
        this.handler_onLayerAddResult = map.on("layer-add-result", this.onLayerAddResult);
    }

    var self = this;
    var _addAGSLayer = function() { // call from URL checker async
        // detect layer type
        this.log("_addAGSLayer. ask for layer meta " + layerURL);
        var req = esri.request({
            url: layerURL,
            content:{"f": "json"},
            callbackParamName:"callback"
        });
        req.then(
            dojo.hitch(self, function(lyrmeta) {
                this.log("addAGSLayer.getLayerMeta: " + lyrmeta + "; url: " + layerURL);
                vslib.dir(lyrmeta);
                var tiledMap = lyrmeta.singleFusedMapCache || false;
                this.log("addAGSLayer.getLayerMeta. Is it tiledMap: " + tiledMap);
                var haveLayers = lyrmeta.layers || false;
                if(haveLayers) haveLayers = true;
                this.log("addAGSLayer.getLayerMeta. Is it haveLayers: " + haveLayers);
                var haveSR = lyrmeta.spatialReference ? true : false;
                this.log("addAGSLayer.getLayerMeta. Is it have spatialReference: " + haveSR);
                //~ featureserver // http://map.govvrn.ru/ArcGIS/rest/services/Administr/FeatureServer
                //~ Is it have spatialReference: false
                //~ dynamiclayer // http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Petroleum/KSPetro/MapServer
                //~ Is it tiledMap: false
                //~ Is it haveLayers: true
                //~ featurelayer // http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Hydrography/Watershed173811/MapServer/0
                //~ Is it tiledMap: false
                //~ Is it haveLayers: false
                //~ tiledMap // http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer
                //~     different wkid http://map.govvrn.ru/ArcGIS/rest/services/VRN/MapServer
                //~ Is it tiledMap: true
                //~ Is it haveLayers: true
                var lyr = null;
                if(tiledMap) {
                    if(lyrmeta.spatialReference.wkid == map.spatialReference.wkid) {
                        this.log("addAGSLayer: ArcGISTiledMapServiceLayer as tiled");
                        lyr = new esri.layers.ArcGISTiledMapServiceLayer(layerURL,
                            sett || {id: layerID} );
                    }
                    else {
                        this.log("addAGSLayer: ArcGISTiledMapServiceLayer as dynamic");
                        lyr = new esri.layers.ArcGISDynamicMapServiceLayer(layerURL,
                            sett || {id: layerID} );
                    }
                }
                else { // no tiled
                    if(haveLayers && haveSR) {
                        this.log("addAGSLayer: ArcGISDynamicMapServiceLayer");
                        lyr = new esri.layers.ArcGISDynamicMapServiceLayer(layerURL,
                            sett || {id: layerID} );
                    }
                    else { // maybe it's an FeatureLayer? type: "Feature Layer"
                        this.log("addAGSLayer: FeatureLayer");
                        // 2013-09-27 I've beeng told that FeatureLayer must not be able to add
                        vslib.log("Добавление слоев типа 'FeatureLayer' не поддерживается данной версией программы.", true);
                        return;
                        lyr = new esri.layers.FeatureLayer(layerURL,
                            { id: layerID,
                              mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
                              outFields:["*"] } );
                    }
                }
                if(lyr) {
                    lyr.extData = sett;
                    if(sett) {
                        this.log("addAGSLayer. map.addLayer, sett:");
                        vslib.dir(sett);
                        if(sett.visSublayers.length < 30) {
                            lyr.setVisibleLayers(sett.visSublayers);
                        }
                        map.addLayer(lyr, sett.index);
                    } else {
                        map.addLayer(lyr);
                    }

                }
            }),
            dojo.hitch(self, function(err) {
                vslib.log("Сбой доступа к метаданным слоя '" + layerURL + "'. \n" +
                    "addAGSLayer.getLayerMeta failed: " + err, false);
                alert("Нет данных слоя. \nВозможно ошибка в написании URL '" + layerURL + "'. \n" + "Ответ ГИС сервера '" + err +"'. \nО всех ошибках просьба сообщать на mp@allgis.org");
                vslib.dir(err);
            })
        ); // end of layer query
    }; // _addAGSLayer: function()

    // check url (wrong url: http://xz.pz)
    vslib.checkServerExistence(
        layerURL,
        function(params) {
            self.log("addAGSLayer. URL is OK: " + params.url);
            _addAGSLayer();
        },
        function(params) {
            self.log("addAGSLayer. URL is not OK: " + params.url);
            vslib.log("Программа не может найти сервер " + params.url, true);
        },
        {url: layerURL}
    );
    return true;
}, // addAGSLayer


//on map event -- update the legend
onLayerAddResult: function (evt) {
    vsapp.log('onLayerAddResult, update legend ...');
    try {
        //~ handler_onLayerAddResult.remove();
        //~ handler_onLayerAddResult = '';

        // legendDijit = new agsjs.dijit.TOC
        //~ vslib.destroyDijit('legendAndTOC');
        // can't destroy this dijit

        vsapp.log('onLayerAddResult: event:');
        vslib.dir(evt);

        if(evt.layer.extData) {
            //~ evt.layer.setDisableClientCaching(true);
            //~ evt.layer.hide();
            //~ evt.layer.setVisibleLayers(evt.layer.extData.visSublayers, false);
            //~ evt.layer.show();
            //~ setTimeout(function() { evt.layer.refresh(); }, 1000);
        }

        // refresh TOC
//        var toc = dijit.byId('legendAndTOC');
//        toc.refresh();
    } catch(ex) {
        vslib.dir(ex);
        vslib.log("Ошибка в процессе обновления легенды. \n" +
            'mpvapp.onLayerAddResult error: ' + ex.description + "\n" + ex.message,
            true);
        vsapp.log('onLayerAddResult. err stack: ' + ex.stack);
        window.lastex = ex;
    }
}, // onLayerAddResult


// on button showAddLayersFromLibUI; open layers library TV panel
openTVLib: function() {
    var tvcp = dijit.byId('tvlibPanel');
    if(tvcp) { ; }
    else {
        tvcp = new dijit.layout.ContentPane({
            title: 'Библиотека слоев',
            selected: true,
            region: 'center',
            id: 'tvlibPanel'
        });

        dijit.byId('stackContainer').addChild(tvcp);
        dojo.addClass(dojo.byId('tvlibPanel'), 'panel_content');
    }
    navigateStack('tvlibPanel');

    var tvlibDijit = dijit.byId('tvlibDijit');
    if(tvlibDijit) { ; }
    else {
        tvlibDijit = new vs.dijit.tvlib({
            id    : 'tvlibDijit',
            map   : map,
            //~ libURL: 'http://www.allgis.org/bonus/mapservices.list.xml'
            //~ libURL: 'http://cgis.allgis.org/miniportal/mapservices.list.xml'
            libURL: 'mapservices.list.xml'
        });

        dojo.byId('tvlibPanel').appendChild(tvlibDijit.domNode);
    }

    if (dojo.isIE === 8) {
        setTimeout(function () {
            tvlibDijit.startup();
        }, 100);
    } else {
        tvlibDijit.startup();
    }
}, // openTVLib


// call from showAddLayersFromAGSUI - MenuItem
openAGSDir: function() {
    // panel
    var tvcp = dijit.byId('agsdirPanel');
    if(tvcp) { ; }
    else {
        tvcp = new dijit.layout.ContentPane({
            title: 'Слои ArcGIS Server',
            selected: true,
            region: 'center',
            id: 'agsdirPanel'
        });

        dijit.byId('stackContainer').addChild(tvcp);
        dojo.addClass(dojo.byId('agsdirPanel'), 'panel_content');
    }
    navigateStack('agsdirPanel');

    // widget
    var agsdirDijit = dijit.byId('agsdirDijit');
    if(agsdirDijit) { ; }
    else {
        agsdirDijit = new vs.dijit.agsdir({
            id    : 'agsdirDijit',
            map   : map
        });

        dojo.byId('agsdirPanel').appendChild(agsdirDijit.domNode);
    }

    if (dojo.isIE === 8) {
        setTimeout(function () {
            agsdirDijit.startup();
        }, 100);
    } else {
        agsdirDijit.startup();
    }
}, // openAGSDir


// create and set new Basemap from one (url or 'osm') or from array of urls
// layerMeta is optional
setBasemap: function(svcurl, layerMeta) {
    this.log('setBasemap from: ');
    vslib.dir(svcurl);

    if(layerMeta && layerMeta.spatialReference) {
        vslib.dir(layerMeta);
        if(layerMeta.spatialReference.wkid != map.spatialReference.wkid) {
            var msg = {
                title:      "Сообщение об ошибке",
                content:    '<p>Этот слой не подходит на роль подложки, ибо SpatialReference слоя не совпадает с таковым у карты</p>',
                hrefval:    'http://cgis.allgis.org/miniportal/documentation/help.html#id43',
                hreftitle:  'Как это работает',
            };
            this.alertDialog = vslib.alert(msg, false);
            return;
        }
    }

    var layers = [];
    var layer = '';

    if(typeof svcurl == 'string') {
        svcurl = [svcurl];
    }

    //<String> type	The type of layer, valid values are "BingMapsAerial", "BingMapsHybrid", "BingMapsRoad", "OpenStreetMap", or "WebTiledLayer".
    // Must specify either the url or type parameter except for WebTiledLayers where url and type is required.
    for(idx in svcurl) {
        if(svcurl[idx] == 'osm') {
            layer = new esri.dijit.BasemapLayer({
                type: 'OpenStreetMap'
            });
        }
        else {
            layer = new esri.dijit.BasemapLayer({
                url: svcurl[idx]
            });
        }
        layer._basemapGalleryLayerType = true; // todo: set layer._basemapGalleryLayerType property
        layers.push(layer);
    }

    var bmID = 'temp.esri.dijit.Basemap';
    var basemap = new esri.dijit.Basemap({
        layers: layers,
        title:  'VDynamicBasemap',
        id:     bmID
    });
    vslib.dir(basemap);

    var basemapGallery = dijit.byId('basemapGalleryDijit');
    basemapGallery.add(basemap);
    basemapGallery.select(bmID);
    basemapGallery.remove(bmID);
}, // setBasemap


// create save object with map params; save object to server; get save ID from server; show ID to user
getLink2Map: function() {
    this.log('getLink2Map. save object...');
	var msg = {
                title:      "Ссылка на карту",
                content:    '<p>Сохранение ...</p>',
                hrefval:    'http://cgis.allgis.org/miniportal/documentation/help.html#id9',
                hreftitle:  'Как это работает',
            };
    this.alertDialog = vslib.alert(msg, false);

    var save = { // https://developers.arcgis.com/en/javascript/jsapi/map-amd.html
        extent:     map.extent,
        basemap:    [],
        layers:     []
    };
    save.extent._parts = [];

    var self = this;
    array.forEach(map.layerIds, // map layers
        function(item, idx) {
            var ml = map.getLayer(item);
            self.log("getLink2Map.forEach map.layerIds, map layer is: " + idx);
            vslib.dir(ml);

            //~ if(idx == 0) {
            //~ if(ml._basemapGalleryLayerType) {
            if(vslib.isBasemapLayer(map, ml)) {
                // basemap processing. basemap layers may be more then one
                if(ml.url) {
                    save.basemap.push(ml.url);
                }
                return;
            }
            var layer = {
                id:         ml.id,
                url:        ml.url,
                visible:    ml.visible,
                layerInfos: [],
                index:      idx
            };

            array.forEach(ml.layerInfos, // sublayers
                function(lyrinf, liidx) {
                    if(vslib.isGroupSublayer(lyrinf)) { // skip group layer
                        return;
                    }
                    var li = {
                        id:         lyrinf.id,
                        name:       lyrinf.name,
                        visible:    lyrinf.visible
                    };
                    layer.layerInfos.push(li);
                }
            ); // end forEach layer.layerInfos

            save.layers.push(layer);
        }
    ); // end forEach layer

    this.log('getLink2Map. save object: ');
    vslib.dir(save);
    var saveStr = dojo.json.stringify(save);
    this.log('getLink2Map. save string: ' + saveStr);

    // calc data hash on client, nobody knows for what
    // http://jsfiddle.net/BtcR3/4/
    require(["dojox/encoding/digests/SHA1", "dojox/encoding/digests/_base"],
        function(SHA1, digests) {
            self.log('getLink2Map.dojox.digests saveStr.SHA1.hex: ' + SHA1(saveStr, digests.outputTypes.Hex));
        }
    );

    this.storeUrl = 'store/save.ashx';
    var req = esri.request(
        {
            //~ callbackParamName:  "callback",
            url:                this.storeUrl,
            content:            {map: saveStr}
        },
        {usePost: true}
    ); // esri.request

    req.then(
        dojo.hitch(this, function(data) {
            try {
                this.alertDialog.hide();
                this.log('getLink2Map.store.save, responce:');
                vslib.dir(data);
                this.log('getLink2Map.store.save id: ' + data.sha1);
                //~ vslib.alert("Карта сохранена, ссылка: \n" + location.href.split('?')[0] + '?map=' + data.sha1, true);
                //~ window.location.search = 'map=' + data.sha1;
                this.showLinkToMap(location.href.split('?')[0].replace('#', '') + '?map=' + data.sha1);
                //~ throw {
                    //~ level:       "Show Stopper",
                    //~ name:        "getLink2Map Error",
                    //~ message:     "Код еще не готов.",
                    //~ description: "Вы все сделали правильно, только эта функция еще не реализована разработчиком.",
                    //~ toString:    function(){return this.name + ": " + this.message}
                //~ };
            } catch(ex) {
                vslib.log("Ошибка в процессе парсинга ответа хранилища, обратитесь к разработчику. \n" +
                    'getLink2Map.store.save error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('getLink2Map.store.save error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }),
        dojo.hitch(this, function(err) {
            this.alertDialog.hide();
            vslib.log("Сбой доступа к хранилищу '" + this.storeUrl + "'. \n" +
                "getLink2Map.store.save failed: " + err, true);
            vslib.dir(err);
        })
    ); // req.then

    //~ return window.location.toString();
}, // getLink2Map


// show dialog window
//this.showLinkToMap(location.href.split('?')[0] + '?map=' + data.sha1);
showLinkToMap: function(link) {
    var msg = {
        title:      "Ссылка на карту",
        content:    "<p style=\"width: 50em;\" ><input style=\"width: 105%;\" id='tiLinkToMap' type='text' value='" +
            link +
            "' name='q'></p>",
		hrefval:    'http://cgis.allgis.org/miniportal/documentation/help.html#id9',
        hreftitle:  'Как это работает',
    };
    this.alertDialog = vslib.alert(msg, false);
}, // showLinkToMap


// check window.location.search for map=saveID
// load map from save ID
checkForLoadFromSave: function() {
    var saveID = window.location.search.split('?map=');
    if(saveID.length < 2) { saveID = window.location.search.split('&map='); }
    if(saveID.length < 2) { saveID = window.location.search.split(';map='); }
    if(saveID.length < 2) {
        this.log("checkForLoadFromSave. haven't save id");
        return;
    }
	var msg = {
                title:      "Ссылка на карту",
                content:    '<p>Загрузка ...</p>',
                hrefval:    'http://cgis.allgis.org/miniportal/documentation/help.html#id9',
                hreftitle:  'Как это работает',
            };
    this.alertDialog = vslib.alert(msg, false);
    saveID = saveID[1];
    this.log("checkForLoadFromSave. save id: " + saveID);

    this.loadUrl = 'store/load.ashx';
    var req = esri.request(
        {
            callbackParamName:  "callback",
            url:                this.loadUrl,
            content:            {map: saveID}
        }
    ); // esri.request

    req.then(
        dojo.hitch(this, function(data) {
            try {
                this.log('checkForLoadFromSave.request');
                //~ vslib.dir(data);
                // load map
                setTimeout(
                    function () {
                        try {
                            vsapp.loadMap(data);
                        }
                        catch(ex) {
                            vslib.log("Ошибка в процессе загрузки карты, обратитесь к разработчику. \n" +
                                'checkForLoadFromSave.loadMap error: ' + ex.description + "\n" + ex.message,
                                true);
                            vsapp.log('checkForLoadFromSave.loadMap error stack: ' + ex.stack);
                            window.lastex = ex;
                        }
                    },
                    1500
                );
                //~ this.loadMap(data);
            } catch(ex) {
                this.alertDialog.hide();
                vslib.log("Ошибка в процессе загрузки карты, обратитесь к разработчику. \n" +
                    'checkForLoadFromSave.request error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('checkForLoadFromSave.request error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }),
        dojo.hitch(this, function(err) {
            this.alertDialog.hide();
            vslib.log("Сбой доступа к хранилищу '" + this.loadUrl + "'. \n" +
                "checkForLoadFromSave.request failed: " + err, true);
            vslib.dir(err);
        })
    ); // req.then
}, // checkForLoadFromSave


// load map from json object - extent, layers
loadMap: function(mapdata) {
    this.log("loadMap");
    vslib.dir(mapdata);

    map.removeAllLayers(); // also remove basemap

    if(mapdata.basemap.length > 0) {
        this.setBasemap(mapdata.basemap); // map service urls
    }
    else {
        this.log("loadMap. basemap: osm");
        this.setBasemap('osm'); // map service urls
        //~ map.setBasemap("osm") // A valid basemap name. Valid values are:
        // "streets" , "satellite" , "hybrid", "topo", "gray", "oceans", "national-geographic", "osm".
    }

    var extent = new esri.geometry.Extent(
        mapdata.extent.xmin, mapdata.extent.ymin, mapdata.extent.xmax, mapdata.extent.ymax,
        new esri.SpatialReference({ wkid: mapdata.extent.spatialReference.wkid })
    );
    map.setExtent(extent);

    var self = this;
    array.forEach( // map layer
        mapdata.layers.sort(function(a, b) { return parseFloat(a.index) - parseFloat(b.index); } ),
        function(layer) {
            //~ vslib.dir(layer);
            var vsub = [];
            array.forEach( // layer sublayer
                layer.layerInfos,
                function(li) {
                    if(li.visible) {
                        vsub.push(li.id);
                    }
                }
            ); // end forEach sublayer
            if(vsub.length === 0) {
                vsub.push(-1);
            }
            var sett = {
                url:            layer.url,
                id:             layer.id,
                visible:        layer.visible,
                visSublayers:   vsub,
                index:          layer.index
            };
            self.addAGSLayer(layer.url, sett);
        }
    ); // end forEach layer

    setTimeout(
        function() { vsapp.alertDialog.hide(); },
        1500
    );
}, // loadMap


log: function(str, doalert) {
    vslib.log('vs.mpvapp.' + str, doalert);
} // log
}; // vlibFactory

    vslib.log('vs.mpvapp declare class');
    return declare("vs.mpvapp", null, vlibFactory);
}); // define

console.log('vs.mpvapp leave');
