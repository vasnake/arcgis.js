try {
    console.log('mpvlib console check');
} catch(ex) {
    var cn = new Object();
    cn.log = function(v){ window.status='log: '+v+''; };
    cn.dir = function(v){ window.status='obj: '+v+''; };
    cn.table = cn.dir;
    window.console = cn;
    console = cn;
}

console.log('mpvlib enter');

// http://stackoverflow.com/questions/2308134/trim-in-javascript-not-working-in-ie
if(typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

if(typeof Number.prototype.padLeft !== 'function') {
    Number.prototype.padLeft = function(base, chr) {
        var  len = (String(base || 10).length - String(this).length) + 1;
        return len > 0 ? new Array(len).join(chr || '0') + this : this;
    };
}

// http://stackoverflow.com/questions/16135814/check-for-ie-10
// And access the properties like IE.isTheBrowser and IE.actualVersion
// also dojo.has('ie') <= 10 in http://dojotoolkit.org/reference-guide/1.7/quickstart/browser-sniffing.html
var IE = (function () {
    "use strict";

    var ret, isTheBrowser,
        actualVersion = "n/a",
        jscriptMap, jscriptVersion;

    isTheBrowser = false;
    jscriptMap = {
        "5.5": "5.5",
        "5.6": "6",
        "5.7": "7",
        "5.8": "8",
        "9": "9",
        "10": "10"
    };
    jscriptVersion = new Function("/*@cc_on return @_jscript_version; @*/")();

    if (jscriptVersion !== undefined) {
        isTheBrowser = true;
        actualVersion = jscriptMap[jscriptVersion];
    }

    ret = {
        isTheBrowser: isTheBrowser,
        actualVersion: actualVersion
    };

    return ret;
}()); // IE object


var vlibFactory = null;
define(
    ["dojo/_base/declare", "dojo/dom", 'dojo/has', "dijit/form/Button",
     "dojox/json/ref", 'vs/dijit/alert'],
    function(declare, dom, has, Button, Ref, myalert) {

console.log('vs.mpvlib declare vlibFactory');
vlibFactory = {

constructor: function(args) {
    console.log('vs.mpvlib constructor');
    declare.safeMixin(this, args);
},


getTimeStamp: function(date) {
    var d = date || new Date(),
        dformat = [
            d.getFullYear(),
            (d.getMonth()+1).padLeft(),
            d.getDate().padLeft()
        ].join('-') + ' ' + [
            d.getHours().padLeft(),
            d.getMinutes().padLeft(),
            d.getSeconds().padLeft()
        ].join(':') + '.' +
            d.getMilliseconds();

    return dformat;
}, // getTimeStamp


log: function(str, doalert) { // write app messages to log
    try {
        logstr = this.getTimeStamp() + ': ' + str;
        console.log(logstr);
        if(doalert && doalert === true) {
            try {
                this.alert(str, true);
            } catch(iex) {
                console.log("vs.mpvlib.log.alert failed: " + iex.message + '; ' + iex.description);
                alert(str);
            }
        }
    } catch(ex) {
        window.status = 'mpvlib.log error: ' + ex.message + '; ' + ex.description + '; Log msg: ' + str;
    }
}, // log


dir: function(obj) { // write obj to log
    try {
        //~ if (IE.isTheBrowser) {
        if (has('ie') <= 10) {
            this.log(dojox.json.ref.toJson(obj));
            //~ this.log(JSON.stringify(obj));
            //~ this.log(JSON.stringify(obj),
                //~ function(key, val) {
                    //~ if(key == 'map' || key == '_map') { return 'cutted'; }
                    //~ if(key == '__proto__') { return 'cutted'; }
                    //~ if(key.indexOf('_parent') >= 0) { return 'cutted'; }
                    //~ return val;
                //~ }
            //~ );
            //~ this.log("no 'dir' for IE");
        } else {
            console.dir(obj);
        }
    }
    catch(ex) {
        //~ alert(ex.message + ';\n' + ex.description);
        window.status = 'mpvlib.dir error: ' + ex.message + '; ' + ex.description;
    }
}, // dir


toJson: function(obj) {
    return dojox.json.ref.toJson(obj);
}, // toJson


fromJson: function(str) {
//    this.log("mpvlib.fromJson: " + str);
    return dojox.json.ref.fromJson(str);
}, // fromJson


destroyDijit: function(dijitID) {
    // some dijits can't be destroyed, e.g. TOC

    //var thisNode = dojo.byId(domID);
    //~ console.debug(dijit.registry._hash);
    //~ dojo.forEach(dijit.findWidgets(dojo.byId(dijitID)), function(w) {
        //~ w.destroyRecursive(false);
    //~ });

    var thisNode = dijit.byId(dijitID);
    if(thisNode) {
        this.log('mpvlib.destroyDijit: destroy ' + dijitID);
        thisNode.destroyRecursive(false);

        //~ var thisDijit = dijit.byNode(thisNode);
        //~ if (thisDijit) {
            //~ thisDijit.destroyRecursive(false);
        //~ }
        dojo.destroy(thisNode);
    } else {
        this.log('mpvlib.destroyDijit: no such ID ' + dijitID);
    }

    //~ var widgets = dijit.findWidgets("layerBtn");
    //~ dojo.forEach(widgets, function(w) {
        //~ w.destroyRecursive(false);
    //~ });
    //~ console.debug(dijit.registry._hash);
}, // destroyDijit


// return string: layer title
getLayerTitle: function(lyr) {
    // title: vslib.getLayerTitle(evt.layer) // evt.layer.name || vslib.partOfString(evt.layer.url, '/', -2)
    var res = 'no title';
    try {
        res = lyr.name || this.partOfString(lyr.url, '/', -2);
    }
    catch(ex) {
        this.log('mpvlib.getLayerTitle. not AGS layer');
        try {
            if(lyr.id == "layer_osm") {
                res = "OpenStreetMap ";
            }
        }
        catch(ex2) {
            this.log('mpvlib.getLayerTitle. not OSM layer');
        }
    }
    return res;
},


// if(vslib.strEndsWith(item.url, 'FeatureServer')) doSmth();
strEndsWith: function(str, suffix, isCI) {
    if(isCI ? isCI : false) {
        str = str.toLowerCase();
        suffix = suffix.toLowerCase();
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}, // strEndsWith: function(str, suffix, isCI)


//if(vslib.strStartsWith(item, "_"))
strStartsWith: function(str, prefix, isCI) {
    if(isCI ? isCI : false) {
        str = str.toLowerCase();
        prefix = prefix.toLowerCase();
    }
    return str.indexOf(prefix, 0) === 0;
}, // strStartsWith


// var layerID = vslib.getLayerID(layerURL);
// layer ID must be equal for same URLs regardless URL encoding
getLayerID: function(layerURL) {
    this.log("mpvlib.getLayerID. layerURL: " + layerURL);
    var id = decodeURI(layerURL);
    this.log("mpvlib.getLayerID. layerID: " + id);
    return id;
}, // getLayerID


// check HTTP responce, if status 200 - OK, another - error
checkServerExistence: function(url, urlokCallback, urlerrCallback, params) {
    // check url (wrong url: http://xz.pz)
    var self = this;
    require(["esri/request"], function(esriRequest) { // https://developers.arcgis.com/en/javascript/jshelp/inside_esri_request.html
        var request = esriRequest(
            {
                url: url,
                content: {f: 'pjson'},
                // don't use jsonp, that method can't catch error even with proxy
                //callbackParamName: 'callback',
                //handleAs: "json",
                handleAs: "text",
                timeout: 33000
            },
            {useProxy: true} // http://localhost:8088/jsproxy/proxy.ashx?http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=pjson
        );
        request.then(
            function (data) {
                self.log("mpvlib.checkServerExistence. URL is OK: " + url);
                urlokCallback(params);
            },
            function (error) {
                self.log("mpvlib.checkServerExistence. URL is not OK: " + url);
                urlerrCallback(params);
            }
        );
    });
    return false;
}, // checkServerExistence


// show pseudo modal dialog. If realblock is true using window.alert
// alert: function(msg) { alert(msg); },
alert: function(msg, realblock) {
    this.log("mpvlib.alert. message: " + msg);
    if(realblock) {
        alert(msg);
        return;
    }

// customize your message here
    var template = '<table class="dijitDialogPaneActionBar" style="width: 55em;"><tr>' +
        '<td align="left"><a target="_blank" href="{href}">{hreftitle}</a></td>' +
        '<td align="righr"><a target="_blank" href="{email}">{emailtitle}</a></td>' +
        '<td><span id="alertDialogOKButtonSpan"></span></td>' +
        '</tr></table>';
    var okButton = new Button({
        label: 'OK',
        onClick: function(){ dijit.byId("alertDijit").hide(); }
    });

// set params
    var params = {};
    if(typeof msg == 'string') {
        params = {
            title:      "Сообщение МП",
            content:    '<p>' + (msg || "Ахтунг!") + '</p>',
            hrefval:    'http://cgis.allgis.org/miniportal/documentation/help.html',
            hreftitle:  'Как это работает',
            email:      'mailto:mp@allgis.org?subject=miniportal',
            emailtitle: 'mp@allgis.org'
        };
    }
    else {
        params = msg;
    }
// set links
    if(params.hrefval) {
        template = template.replace('{href}', params.hrefval);
        if(params.hreftitle) { template = template.replace('{hreftitle}', params.hreftitle); }
    }
    else {
        template = template.replace('{href}', '#');
        template = template.replace('{hreftitle}', '');
    }

    if(params.email) {
        template = template.replace('{email}', params.email);
        if(params.emailtitle) { template = template.replace('{emailtitle}', params.emailtitle); }
    }
    else {
        template = template.replace('{email}', '#');
        template = template.replace('{emailtitle}', '');
    }

    params.content =    params.content + template;
    params.style =      params.style || "width: 600px;";
    params.id =         "alertDijit";

    try {
// simple modal dialog
        vslib.destroyDijit('alertDijit');
        var myDialog = new dijit.Dialog(params);
        dojo.byId('alertDialogOKButtonSpan').appendChild(okButton.domNode);
        myDialog.show();
        return myDialog;

// or you can use extended dijit
        var self = this;
        var dialog = new myalert(params); // http://www.speich.net/articles/2011/01/02/creating-a-blocking-confirm-dialog-with-dojo/
        dialog.show().then(
            function(remember) {
                // user pressed ok button
                // remember is true, when user wants you to remember his decision (user ticked the check box)
                if (remember) {
                  // do something and never show this dialog again
                    self.log('myalert OK, remember - never show myalert with this message again');
                }
                else {
                  // do something
                    self.log('myalert OK, do something');
                }
            },
            function() {
                // user pressed cancel button
                // do something
                self.log('myalert cancel');
            }
        );
        return;
    }
    catch(ex) {
        this.log("alert. Error: ");
        vslib.dir(ex);
        alert(msg);
    }
}, // alert


// check for 'layer is basemap'
isBasemapLayer: function(map, lyr) {
    this.log('vs.mpvlib.isBasemapLayer. layer:');
    this.dir(lyr);

    if(lyr.loaded) {
        if(lyr._basemapGalleryLayerType) {
            this.log('vs.mpvlib.isBasemapLayer. true: _basemapGalleryLayerType');
            return true;
        }
        if(!lyr.url) { // osm
            this.log('vs.mpvlib.isBasemapLayer. true: empty url');
            return true;
        }
        var firstLyr = map.getLayer(map.layerIds[0]);
        if(firstLyr.id == lyr.id) {
            this.log('vs.mpvlib.isBasemapLayer. true: map.layers[0] == lyr');
            return true;
        }
    }
    return false;
}, // isBasemapLayer


isGroupSublayer: function(layerInfo) {
    if(layerInfo.subLayerIds && layerInfo.subLayerIds.length > 0) {
        return true;
    }
    return false;
}, // isGroupSublayer


partOfString: function(str, delim, pos) {
    var arr = str.split(delim);
    if(pos < 0) return arr[arr.length + pos];
    return arr[pos];
}
}; // vlibFactory


    console.log('vs.mpvlib declare class');
    return declare("vs.mpvlib", null, vlibFactory);
}); // define

console.log('mpvlib leave');
