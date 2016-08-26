console.log('mpvapp enter');

define(["dojo/_base/declare", "vs/mpvlib", "vs/dijit/tvlib", 'vs/dijit/agsdir'],
    function(declare, mpvlib, tvlib, agsdir) {
        try {vslib.log('try vslib');} catch(ex) {vslib = new mpvlib();}
        vslib.log('vs.mpvapp declare class');

        return declare("vs.mpvapp", null, { // create class, return constructor

constructor: function(args) {
    vslib.log('vs.mpvapp constructor');
    declare.safeMixin(this, args);
    this.handler_onLayerAddResult = null; // handler_onLayerAddResult = map.on("layer-add-result", func_onLayerAddResult);
}, // constructor


// add AGS layer to map
addAGSLayer: function(layerURL) {
    // define layer type (maplayer tiled, maplayer dynamic, featurelayer)
    // create new layer object
    // add layer to map
    // update legend
    this.log('addAGSLayer, layerURL: ' + layerURL);

    // add map.onLayerAddResult event processor

    //https://developers.arcgis.com/en/javascript/jssamples/widget_legend.html
    //dojo.connect(map, 'onLayersAddResult', function (evt) {});
    if (this.handler_onLayerAddResult) {
        this.log('addAGSLayer, handler_onLayerAddResult defined already');
    } else {
        this.log('addAGSLayer, set handler_onLayerAddResult');
        this.handler_onLayerAddResult = map.on("layer-add-result", this.onLayerAddResult);
    }

    // detect layer type

    var req = esri.request({
        url: layerURL,
        content:{"f": "json"},
        callbackParamName:"callback"
    });
    req.then(
        dojo.hitch(this, function(lyrmeta) {
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
                    lyr = new esri.layers.ArcGISTiledMapServiceLayer(layerURL, {id: layerURL} );
                }
                else {
                    this.log("addAGSLayer: ArcGISTiledMapServiceLayer as dynamic");
                    lyr = new esri.layers.ArcGISDynamicMapServiceLayer(layerURL, {id: layerURL});
                }
            }
            else { // no tiled
                if(haveLayers && haveSR) {
                    this.log("addAGSLayer: ArcGISDynamicMapServiceLayer");
                    lyr = new esri.layers.ArcGISDynamicMapServiceLayer(layerURL, {id: layerURL});
                }
                else { // maybe it's an FeatureLayer?
                    this.log("addAGSLayer: FeatureLayer");
                    // 2013-09-27 I've beeng told that FeatureLayer must not be able to add
                    vslib.log("Добавление слоев типа 'FeatureLayer' не поддерживается данной версией программы.", true);
                    return;
                    lyr = new esri.layers.FeatureLayer(layerURL,
                        { id: layerURL,
                          mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
                          outFields:["*"] } );
                }
            }
            if(lyr) {
                map.addLayer(lyr);
            }
        }),
        dojo.hitch(this, function(err) {
            vslib.log("Сбой доступа к метаданным слоя '" + layerURL + "'. \n" +
                "addAGSLayer.getLayerMeta failed: " + err, false);
			alert("Нет данных слоя. \nВозможно ошибка в написании URL '" + layerURL + "'. \n" + "Ответ ГИС сервера '" + err +"'. \nО всех ошибках просьба сообщать на mp@allgis.org");
            vslib.dir(err);
        })
    ); // end of layer query
	return true;
}, // addAGSLayer


//on map event -- update the legend
onLayerAddResult: function (evt) {
    this.log('onLayerAddResult, update legend ...');
    try {
        //~ handler_onLayerAddResult.remove();
        //~ handler_onLayerAddResult = '';

        // legendDijit = new agsjs.dijit.TOC
        //~ vslib.destroyDijit('legendAndTOC');
        // can't destroy this dijit

        this.log('onLayerAddResult: event:');
        vslib.dir(evt);
        this.log('onLayerAddResult: gLegendLayers:');
        vslib.dir(gLegendLayers);

        var lyrinfo = {
            defaultSymbol: false,
            layer: evt.layer,
            // layerObject: evt.layer,
            title: vslib.getLayerTitle(evt.layer)
        }
        // gLegendLayers = esri.arcgis.utils.getLegendLayers(response);
        gLegendLayers.push(lyrinfo);

        addLegendDijit(gLegendLayers);
    } catch(ex) {
        vslib.dir(ex);
        vslib.log("Ошибка в процессе обновления легенды. \n" +
            'mpvapp.onLayerAddResult error: ' + ex.description + "\n" + ex.message,
            true);
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
            //~ libURL: 'http://cgis.allgis.org/mapedit/mapservices.list.xml'
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


//vsapp.setBasemap(this.serviceUrl);
setBasemap: function(svcurl) {
    this.log('setBasemap ' + svcurl);
    var layer = new esri.dijit.BasemapLayer({
        url: svcurl
    });
    var basemap = new esri.dijit.Basemap({
        layers:[layer],
        title: svcurl,
        id: svcurl
    });

    var basemapGallery = dijit.byId('basemapGalleryDijit');
    basemapGallery.add(basemap);
    basemapGallery.select(svcurl);
    basemapGallery.remove(svcurl);
}, // setBasemap


log: function(str, doalert) {
    vslib.log('vs.mpvapp.' + str, doalert);
} // log


        }); // declare class vs.mpvapp
    }
);

console.log('mpvapp leave');
