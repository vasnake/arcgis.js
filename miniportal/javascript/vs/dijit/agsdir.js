// layers from AGS directory

// reference:
// http://dojotoolkit.org/reference-guide/quickstart/writingWidgets.html
// https://developers.arcgis.com/en/javascript/jstutorials/intro_custom_dijit.html

console.log('vs.dijit.agsdir enter');

require(["dojo/parser", "dijit/TooltipDialog", "dijit/form/DropDownButton", "dijit/form/TextBox", "dijit/form/Button"]);

define("vs/dijit/agsdir",
    ['dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_Templated', 'vs/mpvlib',
        'dojox/gfx', 'dojo/fx/Toggler', 'dojo/_base/array',
        "dojo/dom-construct", "dijit/_TemplatedMixin", "dojo/dom-style",
        "dijit/form/Select",
        "dojo/data/ObjectStore",
        "dojo/store/Memory",
        "dijit/layout/ContentPane", "dijit/layout/LayoutContainer", "dijit/form/ValidationTextBox",
        "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./templates/agsdir.html",
        "dojo/text!./templates/agsdirlayer.html"
    ],
    function(declare, _WidgetBase, _Templated, mpvlib, gfx, Toggler, array,
        domConstruct, _TemplatedMixin, domStyle,
        Select, ObjectStore, Memory,
        ContentPane, LayoutContainer, ValidationTextBox,
        _WidgetsInTemplateMixin,
        dirTemplate, layerTemplate) {

        try {vslib.log('try vslib');} catch(ex) {vslib = new mpvlib();}

//################################################################################

        vslib.log('vs.dijit.agsdir.layerWidget declare class');
        var layerWidget = declare("vs.dijit.agsdir.layerWidget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

templateString: layerTemplate, // dijit/_TemplatedMixin

lyrMeta: {}, // name, type
restUrl: '', // http://server/arcgis/rest
parentW: {}, // agsdir widget

constructor: function(params, srcNodeRef) {
    vslib.log('vs.dijit.agsdir.layerWidget constructor');
    params = params || {};
    dojo.mixin(this, params);
}, // constructor

buildRendering: function() {
    this.inherited(arguments);
    this.log('buildRendering');
},

onShow: function(target, position) {
    //~ this.inherited(arguments);
    this.log('onShow');
},

postCreate: function() {
    this.inherited(arguments);
    this.log('postCreate');
    //~ vslib.dir(this);
    //~ this.on('show', this.onShow);

    var lst = this.lyrMeta.name.split('/');
    var name = lst.pop();
    if(this.lyrMeta.type == 'FeatureServer') { name += ' (Feature Service)'; }
    var fldr = 'Папка: ' + lst.join('/');
    if(fldr.length < 8) { fldr = ''; }

    this.itemNameWidget.set('label', name);
    this.itemFolder.innerHTML = fldr;
    this.itemAddButton.self = this;
    this.itemAddButton.onClick = this.onClickAdd;

    // fill layerCard 'agsdirLayerTooltip' with data from layer metadata
    this.serviceUrl = this.restUrl + '/services/' + this.lyrMeta.name + '/' + this.lyrMeta.type;
    var req = esri.request({
        url: this.serviceUrl,
        content:{"f": "json"},
        callbackParamName:"callback"
    }); // esri.request

    req.then(
        dojo.hitch(this, function(lyrmeta) {
            try {
                this.log('postCreate.getLayerMeta, url: ' + this.serviceUrl);
                vslib.dir(lyrmeta);
                this.fillLayerCard(lyrmeta, name);
            } catch(ex) {
                vslib.log("Ошибка в процессе парсинга метаданных службы, обратитесь к разработчику. \n" +
                    'vs.dijit.agsdir.layerWidget.postCreate.getLayerMeta error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('postCreate.getLayerMeta error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }),
        dojo.hitch(this, function(err) {
            vslib.log("Сбой доступа к метаданным службы '" + this.serviceUrl + "'. \n" +
                "vs.dijit.agsdir.layerWidget.postCreate.getLayerMeta failed: " + err, true);
            vslib.dir(err);
        })
    ); // req.then
}, // postCreate


// fill layerCard 'agsdirLayerTooltip' with data from layer metadata
fillLayerCard: function(lyrmeta, name) {
    this.log('fillLayerCard, name: ' + name + '; lyrmeta:');
    vslib.dir(lyrmeta);
    this.lyrMeta.serviceMeta = lyrmeta;

    this.itemTitle.innerHTML = lyrmeta.documentInfo.Title || name;
	var AuthorStr =	'';
	if (lyrmeta.documentInfo.Author != '')	{ AuthorStr = '<i>Автор:</i> '+lyrmeta.documentInfo.Author; }
    this.itemAuthor.innerHTML = AuthorStr;
	var serviceDescriptionStr = '';
	if(lyrmeta.serviceDescription != '' && lyrmeta.serviceDescription != null) { serviceDescriptionStr = lyrmeta.serviceDescription;	}
    this.itemDescr.innerHTML = serviceDescriptionStr;
    this.itemServiceLink.innerHTML = '<a href="'
        + this.serviceUrl
        + '"  style="padding-left:10px;" target="_blank">Свойства службы</a>';

    this.txtBbox = '';
    try {
        this.bbox = lyrmeta.initialExtent;
        this.txtBbox = '' + this.bbox.xmin + ',' + this.bbox.ymin + ',' + this.bbox.xmax + ',' + this.bbox.ymax + '';
    } catch(ex) {
        this.log('fillLayerCard. Error: ' + ex.description + "; " + ex.message + "; " + ex.stack);
        window.lastex = ex;
    }

    this.log('fillLayerCard, bbox: ' + this.txtBbox);
    //~ vslib.dir(this);
    this.itemPreview.innerHTML = '<img src="' +
        (this.restUrl + '/services/' + this.lyrMeta.name + '/MapServer') +
        '/export?size=150,100&amp;bbox=' +
        this.txtBbox +
        '&amp;format=png32&amp;f=image" />';
}, // fillLayerCard


startup: function() {
    this.inherited(arguments);
    this.log('startup');
},

onClickLayer: function() {
    this.log('onClickLayer. layer: ' + this.lyrMeta.name);
},


onClickAdd: function() {
    var self = this.self || this;
    self.log('onClickAdd. layer: ' + self.lyrMeta.name);
    try {
        //vsapp.addAGSLayer(self.restUrl + '/services/' + self.lyrMeta.name + '/' + self.lyrMeta.type);
        vsapp.addAGSLayer(self.serviceUrl);
    } catch(ex) {
        vslib.log('Сбой добавления слоя: vs.dijit.agsdir.layerWidget.onClickAdd' + ex.message + ';\n' + ex.description, true);
        self.log('onClickAdd. Error: ' + ex.description + "; " + ex.message + "; " + ex.stack);
        window.lastex = ex;
    }
},


onClickSetBasemap: function() {
    try {
        this.log('onClickSetBasemap. layer: ' + this.serviceUrl);
        vsapp.setBasemap(this.serviceUrl, this.lyrMeta.serviceMeta);
    } catch(ex) {
        vslib.log('Сбой установки подложки: vs.dijit.agsdir.layerWidget.onClickSetBasemap' + ex.message + ';\n' + ex.description, true);
        this.log('onClickSetBasemap. Error: ' + ex.description + "; " + ex.message + "; " + ex.stack);
        window.lastex = ex;
    }
},


log: function(str, doalert) {
    vslib.log('vs.dijit.agsdir.layerWidget.' + str, doalert);
} // log

        }); // declare layerWidget

//################################################################################

        vslib.log('vs.dijit.agsdir declare class');
        var AGSDIR = declare("vs.dijit.agsdir", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

qLength: 0, // length of queries queue
services: [], // services/layers list
templateString: dirTemplate, // dijit/_TemplatedMixin
baseClass: "layersAGSDir", // css class

constructor: function(params, srcNodeRef) {
    vslib.log('vs.dijit.agsdir constructor');
    params = params || {};
    if (!params.map) {
        throw new Error('no map defined in params for AGSDIR');
    }
    dojo.mixin(this, params);
}, // constructor

buildRendering: function() {
    this.inherited(arguments);
    this.log('buildRendering');
},

postCreate: function() {
    this.inherited(arguments);
    this.log('postCreate');
},

startup: function() { // called every time when user open the Widget
    this.inherited(arguments);
    this.log('startup');

    // draw GUI
    var frm = dijit.byId('agsdirURLform');
    frm.on("submit", dojo.hitch(this, function() {
        try {
            var val = dijit.byId('agsdirURLtb').get('value').trim();
			if (val=="") { return false; };
            this.log("agsdirURLform on submit, value: '" + val + "'");
            this.processUI(val);
        } catch(ex) {
            this.log('agsdirURLform on submit, error: ' + ex.message + ex. description + ex.stack);
            vslib.dir(ex);
        }
        return false;
    }));

//    dojo.byId('agsdirURLtb').focus();
}, // startup


// ags online ask urls in order:
// http://cgis.allgis.org/arcgis/rest/info?f=json - не нужно
// http://cgis.allgis.org/arcgis/rest/services?f=json&callback=dojo.io.script.jsonp_dojoIoScript1._jsonpCallback
// http://cgis.allgis.org/arcgis/rest/services/Utilities?f=json - не нужно
// из списка сервисов берет название и тип и рисует их в табличке (название (тип)           добавить)
processUI: function(url) {
    this.log("processUI, user input: '" + url + "'");
    if(this.qLength > 0) {
        vslib.log("Идет процесс обработки предыдущего запроса, необходимо дождаться его завершения", false);
        //return;
    }
    this.rootURL = this.normalizeURL(url);
    this.log("processUI, rootURL: '" + this.rootURL + "', must be like 'http://host/arcgis/rest'");

    this.qLength = 1;
    this.services = [];

    // check url (wrong url: http://xz.pz)
    var self = this;
    vslib.checkServerExistence(
        this.rootURL,
        function(params) {
            self.log("processUI. URL is OK: " + params.url);
            self.dirCatalog(self.rootURL + '/services', '/');
        },
        function(params) {
            self.log("processUI. URL is not OK: " + params.url);
            vslib.log("Программа не может найти сервер " + params.url, true);
        },
        {url: this.rootURL}
    );
}, // processUI


// collect services from http://host/arcgis/rest
dirCatalog: function(url, currFolder) {
    this.log("dirCatalog, url: " + url + "; folder: " + currFolder);

    var req = esri.request({
        url: url,
        content:{"f": "json"},
        callbackParamName:"callback"
    }); // esri.request

    req.then(
        dojo.hitch(this, function(lyrsmeta) {
            try {
                this.qLength -= 1;
                this.log("dirCatalog.getLayersMeta: " + lyrsmeta);
                vslib.dir(lyrsmeta);
                this.collectServices(lyrsmeta.services, currFolder);
                this.collectFolders(lyrsmeta.folders, currFolder, url);
                if(this.qLength <= 0) {
                    this.log("dirCatalog.getLayersMeta: dir complete.");
                    this.drawLayersList(this.services);
                }
            } catch(ex) {
                this.qLength = 0;
                window.lastex = ex;
                vslib.log("Ошибка в процессе парсинга каталога служб, обратитесь к разработчику. \n" +
                    'vs.dijit.agsdir.dirCatalog.getLayersMeta error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('dirCatalog.getLayersMeta error stack: ' + ex.stack);
                vslib.dir(ex);
            }
        }),
        dojo.hitch(this, function(err) {
            this.qLength = 0;
            vslib.log("Сбой доступа к метаданным служб '" + url + "'. \n" +
                "vs.dijit.agsdir.dirCatalog.getLayersMeta failed: " + err, false);
				alert("Нет данных сервера. \nВозможно ошибка в написании URL '" + url + "'. \n" + "Ответ ГИС сервера '" + err +"'. \nО всех ошибках просьба сообщать на mp@allgis.org");
            vslib.dir(err);
        })
    ); // req.then
}, // dirCatalog


// save services params
collectServices: function(services, currFolder) {
    this.log('collectServices, folder: '+ currFolder + '; services: ' + services.length);
    if(currFolder == '/') {
        dojo.empty('agsdirListContainer');
    }
    var self = this;
    array.forEach(services, function(item, idx) {
        self.services.push(item);
        self.log("collectServices, service " + (idx+1) + "; name: " + item.name + "; type: " + item.type);
        //~ var nitem = domConstruct.create('div',
            //~ {innerHTML: "Service name: " + item.name + "; type: " + item.type},
            //~ "agsdirListContainer");
    });
}, // collectServices


// dir folders
collectFolders: function(folders, currFolder, url) {
    this.log('collectFolders, currFolder: ' + currFolder + '; folders: ' + folders.length);
    var self = this;
    array.forEach(folders, function(item, idx) {
        self.qLength += 1;
        self.log("collectFolders, folder " + (idx+1) + "; name: " + item);

        if (currFolder == '/' || currFolder == '') { ; }
        else { item = '/' + item; }
        self.dirCatalog(url + currFolder + item, currFolder + item);
    });
}, // collectFolders


// draw layers list from lyrsmeta
drawLayersList: function(services) {
    this.log("drawLayersList, services.length: " + services.length);
    dojo.empty('agsdirListContainer');
    var self = this;
    array.forEach(services, function(item, idx) {
        self.log("drawLayersList, service " + idx + "; name: " + item.name + "; type: " + item.type);
        //~ var nitem = domConstruct.create('div', {innerHTML: "service " + (idx+1) + "; name: " + item.name + "; type: " + item.type}, "agsdirListContainer");

        // FeatureServer processing blocked by Vito 2013-09-27
        if(item.type == 'FeatureServer') {
            self.log("drawLayersList. banned item: " + item.name + '/' + item.type);
        }
        //~ if(item.type == 'MapServer' || item.type == 'FeatureServer') {
        if(item.type == 'MapServer') {
            var lyrW = new layerWidget({
                lyrMeta: item,
                restUrl: self.rootURL,
                parentW: self
            }).placeAt('agsdirListContainer');
            //~ lyrW.startup();
            //~ dojo.connect(lyrW, 'onshow', function(){vslib.log('onShow layerWidget')});
        }
    });
}, // drawLayersList


// make normalized url, like 'http://host/arcgis/rest'
// from user input
normalizeURL: function(url) {
    var norm = url;
    this.log("normalizeURL, input: " + url);

    // check for 'http://'
    var lst = url.split(/http[s]?:\/\//);
    var srv = lst[0]; // url w/o 'http://'
    var scm = 'http://';
    if(lst.length > 1) {
        srv = lst[1];
    }

    // get hostname
    lst = srv.split(/[\/]+/);
    array.some(lst, function(item, num) {
        if(item.length > 3) {
            srv = item;
            return true;
        }
        return false;
    });

    // make url
    norm = scm + srv + '/arcgis/rest'
    this.log("normalizeURL, output: '" + norm + "'");
    return norm;
}, // normalizeURL


log: function(str, doalert) {
    vslib.log('vs.dijit.agsdir.' + str, doalert);
} // log


        }); // declare AGSDIR

return AGSDIR;

}); // define("vs/dijit/agsdir"

console.log('vs.dijit.agsdir leave');
