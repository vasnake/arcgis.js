// layers library TV dijit

// reference:
// http://dojotoolkit.org/reference-guide/quickstart/writingWidgets.html
// https://developers.arcgis.com/en/javascript/jstutorials/intro_custom_dijit.html

console.log('vs.dijit.tvlib enter');

define("vs/dijit/tvlib",
    ['dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_Templated', 'vs/mpvlib',
        'dojox/gfx', 'dojo/fx/Toggler', 'dojo/_base/array',
        "dojo/dom-construct", "dijit/_TemplatedMixin", "dojo/dom-style",
        "dijit/form/Select",
        "dojo/data/ObjectStore",
        "dojo/store/Memory",
        "dojo/text!./templates/layerslib.html",
        "dojo/text!./templates/layer.html"
    ],
    function(declare, _WidgetBase, _Templated, mpvlib, gfx, Toggler, array,
        domConstruct, _TemplatedMixin, domStyle,
        Select, ObjectStore, Memory,
        template, layerTemplate) {

        try {vslib.log('try vslib');} catch(ex) {vslib = new mpvlib();}
        tvlibSpecialTopic = 'w/o topic';

//################################################################################

        vslib.log('vs.dijit.tvlib.layerDefinition declare class');
        var layerDefinition = declare("vs.dijit.tvlib.layerDefinition", null, {

numID  : 0,
url    : '',
type   : '',
id     : '',
name   : '',
topic  : '',
preview: '',

constructor: function(params, srcNodeRef) {
    //~ vslib.log('vs.dijit.tvlib.layerDefinition constructor');
    params = params || {};
    dojo.mixin(this, params);
}, // constructor

setParam: function(attrName, attrValue) {
    var name = attrName.trim().toLowerCase();
    var val = attrValue.trim();

    switch(name) {
        case 'type':
            this.type = val;
            break;
        case 'id':
            this.id = val;
            break;
        case 'name':
            this.name = val;
            break;
        case 'topic':
            this.topic = val;
            break;
        case 'preview':
            this.preview = val;
            break;
    }
} // setParam

        }); // declare layerDefinition

//################################################################################

        var layerWidget = declare([_WidgetBase, _TemplatedMixin], {

lyrDef: null,  // layerDefinition
libTV  : null, // TVLIB widget - parent

templateString: layerTemplate,

constructor: function(params, srcNodeRef) {
    //~ vslib.log('vs.dijit.tvlib.layerWidget constructor');
    params = params || {};
    dojo.mixin(this, params);
}, // constructor

buildRendering: function() {
    this.inherited(arguments);
    //~ this.log('buildRendering');
},

postCreate: function() {
    this.inherited(arguments);
    //~ this.log('postCreate');

    this.itemDesription.innerHTML = this.lyrDef.name;
    this.itemImage.src = this.lyrDef.preview;
    this.itemImage.title = this.lyrDef.name
    this.itemImage.alt = this.lyrDef.name
},

startup: function() {
    this.inherited(arguments);
    //~ this.log('startup');
},

onClickLayer: function() {
    this.log('onClickLayer');
    vsapp.addAGSLayer(this.lyrDef.url);
},

log: function(str, doalert) {
    vslib.log('vs.dijit.tvlib.layerWidget.' + str, doalert);
} // log

        }); // declare layerWidget

//################################################################################

        var layersWidget = declare([_WidgetBase], {

lyrDefs: null, // list of layerDefinition
libTV  : null, // TVLIB widget - parent
topic  : tvlibSpecialTopic, // current topic name

constructor: function(params, srcNodeRef) {
    vslib.log('vs.dijit.tvlib.layersWidget constructor');
    params = params || {};
    dojo.mixin(this, params);
}, // constructor

buildRendering: function() {
    this.inherited(arguments);
    this.log('buildRendering');
},

postCreate: function() {
    this.inherited(arguments);
    this.log('postCreate');
    //~ vslib.dir(this);
    try {
        var container = this;
        array.forEach(this.lyrDefs, function(item, num) {
            if (item.topic != container.topic && container.topic != tvlibSpecialTopic) {
                return;
            }
            // FeatureServer banned by Vito 2013-09-27
            if(vslib.strEndsWith(item.url, 'FeatureServer', true)) {
                container.log("postCreate. banned item: " + item.url);
                return
            }
            vslib.dir(item);
            var lyrW = new layerWidget({
                lyrDef: item,
                libTV: container.libTV
            }).placeAt(container.domNode);
            lyrW.startup();
        });
    } catch(ex) {
        this.log('postCreate catch: ' + ex.message + '; descr: ' + ex.description + '; stack:' + ex.stack);
        window.lastex = ex;
    }
},

startup: function() {
    this.inherited(arguments);
    this.log('startup');
},

log: function(str, doalert) {
    vslib.log('vs.dijit.tvlib.layersWidget.' + str, doalert);
} // log

        }); // declare layersWidget

//################################################################################

        vslib.log('vs.dijit.tvlib declare class');
        var TVLIB = declare("vs.dijit.tvlib", [_WidgetBase, _TemplatedMixin], {

constructor: function(params, srcNodeRef) {
    vslib.log('vs.dijit.tvlib constructor');
    params = params || {};
    if (!params.map) {
        throw new Error('no map defined in params for TVLIB');
    }
    if (!params.libURL) {
        throw new Error('Не задан URL для получения данных библиотеки');
    }
    dojo.mixin(this, params);
}, // constructor


// dijit/_TemplatedMixin
templateString: template, // "<div>" + "<button data-dojo-attach-event='onclick: increment'>press me</button>" + "&nbsp; count: <span data-dojo-attach-point='counter'>0</span>" + "</div>",
baseClass: "layersLibTV",

buildRendering: function() {
    this.inherited(arguments);
    this.log('buildRendering');
    //~ this.domNode = domConstruct.create("button", {innerHTML: this._i});
},

postCreate: function() {
    this.inherited(arguments);
    this.log('postCreate');
    //~ this.connect(this.domNode, "onclick", "increment");
},


startup: function() { // called every time when user open the library
    // get library data (http://www.allgis.org/bonus/mapservices.list.xml)
    // draw TV
    this.inherited(arguments);
    this.log('startup');

    var libURL = this.libURL; // 'http://www.allgis.org/bonus/mapservices.list.xml';
    // info from https://developers.arcgis.com/en/javascript/jshelp/inside_esri_request.html
    // allgis.org doesn't support http://enable-cors.org/
    // hence we need proxy

    var req = esri.request({
        url     : libURL,
        content : {"f": "xml"},
        handleAs: "xml"
    });
    req.then(
        dojo.hitch(this, function(xmldoc, io) {
            try {
                var lyrs = this.parseXmlLib(xmldoc, io);
                this.drawTV(lyrs);
            } catch(ex) {
                window.lastex = ex;
                vslib.log("Ошибка в процессе парсинга библиотеки, обратитесь к разработчику. \n" +
                    'tvlib.startup.getLayersList error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('tvlib.startup.getLayersList error stack: ' + ex.stack);
                vslib.dir(ex);
            }
        }), // result data
        dojo.hitch(this, function(err) {
            vslib.log("Сбой доступа к данным библиотеки '" + libURL + "'. \n" +
                "tvlib.startup.getLayersList failed: " + err, true);
            vslib.dir(err);
        }) // result error
    ); // end of layer query
}, // startup


// return array of layerDefinition objects from xml document
parseXmlLib: function(xmldoc, io) { // esri.request callback
    this.log("parseXmlLib ...");
    vslib.dir(xmldoc);
    //~ var txt = dojox.xml.parser.innerXML(xmldoc);
    //~ this.log("parseXmlLib, xml text: " + txt);

    var xmllyrs = null;

    try {
        this.log('parseXmlLib set xmllyrs = xmldoc.activeElement.children ...');
        xmllyrs = xmldoc.activeElement.children; // firefox
    } catch(ex) {
        try {
            this.log('parseXmlLib set xmllyrs = xmldoc.children[0].children ...');
            xmllyrs = xmldoc.children[0].children; // chrome
        } catch(ex) {
            this.log('parseXmlLib set xmllyrs = dojo.query("Layer", xmldoc).forEach(function(node ...');
            xmllyrs = []; // IE10
            dojo.query("Layer", xmldoc).forEach(function(node, index, nodeList) {
                xmllyrs.push(node);
            });
        }
    }
    //~ vslib.dir(xmllyrs);

    var listLayers = array.map(xmllyrs, function(xmllayer, num) {
        var textContent = xmllayer.textContent || xmllayer.firstChild.nodeValue;
        this.log("parseXmlLib. node" + num + ": " + textContent.trim());

        // nodeName == Layer
        var lyr = new layerDefinition({
            numID  : num + 1,
            url    : textContent.trim()
        });

        array.forEach(xmllayer.attributes, function(node, num) {
            //~ this.log("parseXmlLib. node" + num + ": " + node.nodeName + ": " + node.nodeValue);
            lyr.setParam(node.nodeName, node.nodeValue);
        });

        return lyr;
    }); // map listLayers

    //~ vslib.dir(listLayers);
    return listLayers;
},


// create ObjectStore from layerDefinition array
createObjectStoreFromLyrDefs: function(lyrs) {
    var lst = array.map(lyrs, function(lyrdef, num) {
        return {id: lyrdef.topic, label: lyrdef.topic};
    });

    var newarr = [{id: tvlibSpecialTopic, label: "Без фильтра"}];
    var unique = {};
    array.forEach(lst, function(item, num) {
        if (!unique[item.id]) {
            newarr.push(item);
            unique[item.id] = item;
        }
    });

    var store = new Memory({
        data: newarr
    });
    var os = new ObjectStore({ objectStore: store });
    return os;
}, // createObjectStoreFromLyrDefs


// draw list of topics and list of layers - TV
drawTV: function(lyrs) {
    this.log("drawTV. lyrs: ");
    vslib.dir(lyrs);
    dojo.empty(this.domNode);

    var os = this.createObjectStoreFromLyrDefs(lyrs);
    var container = this;
    //~ var layersDefinitions = lyrs;

    var selW = new Select({ store: os, maxHeight: -1, style: "width: 98%; margin: 0 1% 10px;" });
    selW.placeAt(this.domNode);
    selW.on("change", function() {
        var newTopic = this.get("value");
        vslib.log("vs.dijit.tvlib.topics Select.change, value: " + newTopic);
        container.updateLayersWidget(lyrs, newTopic);
    });
    //~ selW.startup();

    this.updateLayersWidget(lyrs, tvlibSpecialTopic);
},


// refresh layers list filtered by topic
updateLayersWidget: function(lyrs, newtopic) {
    this.log('updateLayersWidget. newtopic: ' + newtopic);
    vslib.destroyDijit('tvlibLayersListWidget');

    var layersList = new layersWidget({
        id: 'tvlibLayersListWidget',
        lyrDefs: lyrs,
        topic: newtopic,
        libTV: this
    });
    layersList.placeAt(this.domNode);
    //~ layersList.startup();
}, // updateLayersWidget


log: function(str, doalert) {
    vslib.log('vs.dijit.tvlib.' + str, doalert);
} // log


        }); // declare TVLIB

return TVLIB;

}); // define("vs/dijit/tvlib"

console.log('vs.dijit.tvlib leave');
