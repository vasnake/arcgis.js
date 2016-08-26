/**
 * @name Table of Contents (TOC) widget for ArcGIS Server JavaScript API
 * @author: Nianwei Liu
 * @fileoverview
 * <p>A TOC (Table of Contents) widget for ESRI ArcGIS Server JavaScript API. The namespace is <code>agsjs</code></p>
 */
// change log:
// 2013-09-23: Secure service support: Integrated Windows, Token, or via Proxy (IWA or Token); listen to rootLayer onLoad if not already loaded.
// 2013-09-05: Treat root FeatureLayer same as a layer inside a map service, i.e. move the symbol inline if there is only one symbol.
// 2013-08-05: nested groups fix, findTOCNode, onLoad event, css change to a new folder and in sample, added autoToggle option
// 2013-07-24: FeatureLayer, JSAPI3.5, removed a few functionalities: uniqueValueRenderer generated checkboxes; dynamically created layer from TOC config.
// 2012-08-21: fix dojo.fx load that caused IE has to refresh to see TOC.
// 2012-07-26: add ready so it works with compact built (missing dijit._Widget, dijit._Templated).
// 2012-07-23: sync and honor setVisibleLayers.
// 2012-07-19: xdomain build
// 2012-07-18: upgrade to JSAPI v3.0
// 2012-02-02: fix IE7&8 problem when there is "all other value"(default symbol)
// 2011-12-20: refresh method
// 2011-11-04: v1.06: uniquevalue renderer check on/off using definitions. group layer on/off. change css class name. inline style as default. deprecate standard style
// 2011-08-11: support for not showing legend or layer list; slider at service level config; removed style background.

/*global dojo esri*/

// reference: http://dojotoolkit.org/reference-guide/quickstart/writingWidgets.html

define(
    "agsjs/dijit/TOC",
    ['dojo/_base/declare', 'dijit/_Widget', 'dijit/_Templated', 'dojox/gfx', 'dojo/fx/Toggler', 'dijit/form/Slider',
        'vs/mpvlib'],
    function(declare, _Widget, _Templated, gfx, Toggler, Slider, mpvlib) {
    ///dojo.provide('agsjs.dijit.TOC');
    ///dojo.require("dojo.fx.Toggler");
    ///dojo.require('dijit._Widget');
    ///dojo.require('dijit._Templated');
    ///dojo.require('dijit.form.Slider');
    try {vslib.log('try vslib');} catch(ex) {vslib = new mpvlib();}
    vslib.log('agsjs.dijit.TOC declare class');

    /* for AMD load css directly.
     (function(){
     var link = dojo.create("link", {
     type: "text/css",
     rel: "stylesheet",
     href: dojo.moduleUrl("agsjs.dijit", "css/TOC.css")
     });
     dojo.doc.getElementsByTagName("head")[0].appendChild(link);
     }());*/
    /**
     * _TOCNode is a node, with 3 possible types: root layer|serviceLayer|legend
     * @private
     */
    /// dojo.declare("agsjs.dijit._TOCNode", [dijit._Widget, dijit._Templated], {
    var _TOCNode = declare([_Widget, _Templated], {
        //templateString: dojo.cache('agsjs.dijit', 'templates/tocNode.html'),
        templateString: '<div class="agsjsTOCNode">' +
        '<div data-dojo-attach-point="rowNode" data-dojo-attach-event="onclick:_onClick">' +
        '<span data-dojo-attach-point="contentNode" class="agsjsTOCContent">' +
        '<span data-dojo-attach-point="configNode"></span>' +
        '<span data-dojo-attach-point="checkContainerNode"></span>' +
        '<img src="${_blankGif}" alt="" data-dojo-attach-point="iconNode" />' +
        '<span data-dojo-attach-point="labelNode">' +
        '</span></span></div>' +
        '<div data-dojo-attach-point="containerNode" style="display: none;"> </div></div>',
        // each node contains reference to rootLayer, servierLayer(layer within service), legend
        // the reason not to use a "type" property is because in the case of legend, it is necessary
        // to access meta data of the serviceLayer and rootLayer as well.
        rootLayer: null,
        serviceLayer: null,
        legend: null,
        rootLayerTOC: null,
        data: null, // could be one of rootLayer, serviceLayer, or legend
        _childTOCNodes: [],

        constructor: function(params, srcNodeRef){
            dojo.mixin(this, params);
        },


        // extension point. called automatically after widget DOM ready.
        postCreate: function() {
            try {
                this.log('postCreate');
                this._postCreate();
            }
            catch(ex) {
                vslib.log("Ошибка в процессе создания узла легенды. \n" +
                    '_TOCNode.postCreate error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('postCreate error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // postCreate

        _postCreate: function() {
            //~ this.log('_postCreate');
            dojo.style(this.rowNode, 'paddingLeft', '' + this.rootLayerTOC.tocWidget.indentSize * this.rootLayerTOC._currentIndent + 'px');
            // using the availability of certain property to decide what kind of node to create.
            // priority is legend/serviceLayer/rootLayer
            this.data = this.legend || this.serviceLayer || this.rootLayer;
            this.blank = this.iconNode.src;
            if (this.legend) {
                this._createLegendNode(this.legend);
            }
            else {
                if (this.serviceLayer) {
                    this._createServiceLayerNode(this.serviceLayer);
                }
                else {
                    if (this.rootLayer) {
                        this._createRootLayerNode(this.rootLayer);
                    }
                }
            }

            if (this.containerNode && Toggler) { // dojo.fx.
                // if containerNode was not removed, it means this is some sort of group.
                this.toggler = new Toggler({ //dojo.fx.
                    node: this.containerNode,
                    showFunc: dojo.fx.wipeIn,
                    hideFunc: dojo.fx.wipeOut
                });
            }

            if (!this._noCheckNode) { // may be checkboxes
                // typically _noCheckNode means it is a tiledlayer, or legend item that should not have a checkbox
                var chk;
                if (dijit.form && dijit.form.CheckBox) {
                    chk = new dijit.form.CheckBox({ // looks a bug in dijit. image not renderered until mouse over. bug was closed but still exist.
                        // use attr('checked', true) not working either.
                        checked: this.data.visible
                    });
                    chk.placeAt(this.checkContainerNode);
                    chk.startup();
                }
                else {
                    chk = dojo.create('input', {
                        type: 'checkbox',
                        checked: this.data.visible
                    }, this.checkContainerNode);
                }
                this.checkNode = chk;
            }

            // collapsed?
            var showChildren = this.data.visible;
            // if it is a group layer and no child layer is visible, then collapse
            if (this.data._subLayerInfos) {
                var noneVisible = true;
                dojo.every(this.data._subLayerInfos, function(info) {
                    if (info.visible) {
                        noneVisible = false;
                        return false;
                    }
                    return true;
                });
                if (noneVisible)
                    showChildren = false;
            }
            if (this.data.collapsed) showChildren = false;

            // dom ops
            if (this.iconNode && this.iconNode.src == this.blank) {
                dojo.addClass(this.iconNode, 'dijitTreeExpando');
                dojo.addClass(this.iconNode, showChildren ? 'dijitTreeExpandoOpened' : 'dijitTreeExpandoClosed');
            }
            if (this.iconNode) {
                dojo.addClass(this.iconNode, 'agsjsTOCIcon');
            }
            if (this.containerNode) {
                dojo.style(this.containerNode, 'display', showChildren ? 'block' : 'none');
            }
            this.domNode.id = 'TOCNode_' + this.rootLayer.id +
                (this.serviceLayer ? '_' + this.serviceLayer.id : '') +
                (this.legend ? '_' + this.legend.id : '');
        }, // _postCreate


        // root level node, layers directly under esri.Map
        _createRootLayerNode: function(rootLyr) {
            this.log("_createRootLayerNode");

            dojo.addClass(this.rowNode, 'agsjsTOCRootLayer');
            dojo.addClass(this.labelNode, 'agsjsTOCRootLayerLabel');

            var title = this._processTitle(rootLyr);
            rootLyr.collapsed = this.rootLayerTOC.config.collapsed;

            this._setRootLayerSlider(rootLyr);
            this._setRootLayerSubnodes(rootLyr);

            this.labelNode.innerHTML = title;
            dojo.attr(this.rowNode, 'title', title);

            this._setRootLayerMenu(rootLyr);
        }, // _createRootLayerNode


        _setRootLayerMenu: function(rootLayer) {
            // menu params
            var indexUp = null;
            var indexDown = null;
            var styleUp = '';
            var styleDown = '';
            var sublayers = this.rootLayerTOC.tocWidget.layerInfos;
            var count = sublayers.length;

            for (var i = 0; i < count; i++) {
                if (sublayers[i].layer.id == rootLayer.id) {
                    if (count == 1) {
                        styleUp = 'cursor: default; opacity: 0.3;';
                        styleDown = 'cursor: default; opacity: 0.3;';
                    }
                    else {
                        if (i == 0) {
                            styleUp = 'cursor: default; opacity: 0.3;';
                            indexDown = count - 1;
                        }
                        else
                            if (i == sublayers.length - 1) {
                                styleDown = 'cursor: default; opacity: 0.3;';
                                indexUp = 2;
                            }
                            else {
                                indexUp = count - i + 1;
                                indexDown = count - i - 1;
                            }
                    } // count != 1
                    break;
                }
            } // end forEach sublayer

            this.layerMenu = new dijit.DropDownMenu();

            var menuItemZoomTo = new dijit.MenuItem({
                label: 'Приблизить',
                iconClass: 'iconZoomTo',
                onClick: function(){
                    esri.config.defaults.geometryService.project([rootLayer.fullExtent], map.spatialReference, function(res){
                        map.setExtent(res[0]);
                    }, function(err){
                        console.log("Project failed:  ", err);
                    });
                }
            });
            this.layerMenu.addChild(menuItemZoomTo);

            var menuItemMoveUp = new dijit.MenuItem({
                label: 'Выше',
                iconClass: 'iconMoveUp',
                style: styleUp,
                onClick: function(){
                    if (indexUp == null) {
                        return false;
                    }
                    else {
                        map.reorderLayer(rootLayer, indexUp);
                    }
                }
            });
            this.layerMenu.addChild(menuItemMoveUp);

            var menuItemMoveDown = new dijit.MenuItem({
                label: 'Ниже',
                iconClass: 'iconMoveDown',
                style: styleDown,
                onClick: function(){
                    if (indexDown == null) {
                        return false;
                    }
                    else {
                        map.reorderLayer(rootLayer, indexDown);
                    }
                }
            });
            this.layerMenu.addChild(menuItemMoveDown);

            var menuItemRemove = new dijit.MenuItem({
                label: 'Удалить слой',
                iconClass: 'iconRemove',
                onClick: function(){
                    map.removeLayer(rootLayer);
                }
            });
            this.layerMenu.addChild(menuItemRemove);

            var menuItemDescription = new dijit.MenuItem({
                label: '<a href="' + rootLayer.url + '" target="_blank">Описание</a>',
                iconClass: 'iconDescription',
                style: 'cursor: default',
                onClick: function(evt){
                    this.firstChild.click(this, evt);
                }
            });
            this.layerMenu.addChild(menuItemDescription);

            this.layerConfigButton = new dijit.form.DropDownButton({
                iconClass: 'iconConfigure',
                title: 'Настроить',
                dropDown: this.layerMenu,
                style: 'float: right; margin: 0;'
            });
            this.layerConfigButton.placeAt(this.configNode);
        }, // _setRootLayerMenu


        _setRootLayerSubnodes: function(rootLyr) {
            this.log("_setRootLayerSubnodes");

            if (this.rootLayerTOC.config.noLegend) {
                // no legend means no need for plus/minus sign
                dojo.style(this.iconNode, 'visibility', 'hidden');
            }
            else {
                if (rootLyr._tocInfos) {
                    this._createChildrenNodes(rootLyr._tocInfos, 'serviceLayer');
                }
                else {
                    if (rootLyr.renderer) {
                        // for feature layers
                        var r = rootLyr.renderer;
                        if (r.infos) {
                            //UniqueValueRenderer |ClassBreaksRenderer
                            var legs = r.infos;
                            if (r.defaultSymbol && legs.length > 0 && legs[0].label != '[all other values]') {
                                // insert at top
                                legs.unshift({
                                    label: '[all other values]',
                                    symbol: r.defaultSymbol
                                });
                            }
                            var af = r.attributeField + (r.normalizationField ? '/' + r.normalizationField : '');
                            af += (r.attributeField2 ? '/' + r.attributeField2 : '') + (r.attributeField3 ? '/' + r.attributeField3 : '');
                            var anode = dojo.create('div', {}, this.containerNode);
                            dojo.style(anode, 'paddingLeft', '' + this.rootLayerTOC.tocWidget.indentSize * (this.rootLayerTOC._currentIndent + 2) + 'px');
                            anode.innerHTML = af;
                            this._createChildrenNodes(legs, 'legend');
                        }
                        else {
                            //this._createChildrenNodes([rootLayer.renderer], 'legend');
                            this._setIconNode(rootLyr.renderer, this.iconNode, this);
                            dojo.destroy(this.containerNode);
                            this.containerNode = null;
                        }

                    }
                    else {
                        dojo.style(this.iconNode, 'visibility', 'hidden');
                    }
                } // if no _tocInfos - feature layers?
            } // have legend
        }, // _setRootLayerSubnodes


        _setRootLayerSlider: function(rootLayer) {
            if (this.rootLayerTOC.config.slider) {
                this.sliderNode = dojo.create('div', {
                    'class': 'agsjsTOCSlider'
                }, this.rowNode, 'last');

                this.slider = new dijit.form.HorizontalSlider({
                    showButtons: false,
                    value: rootLayer.opacity * 100,
                    intermediateChanges: true,
                    //style: "width:100%;padding:0 20px 0 20px",
                    tooltip: 'adjust transparency',
                    onChange: function(value){
                        rootLayer.setOpacity(value / 100);
                    },
                    layoutAlign: 'right'
                });

                this.slider.placeAt(this.sliderNode);

                dojo.connect(rootLayer, 'onOpacityChange', this,
                    function(op) {
                        try {
                            this.slider.setValue(op * 100);
                        }
                        catch(ex) {
                            vslib.log("Ошибка в процессе установки прозрачности. \n" +
                                '_setRootLayerSlider onOpacityChange error: ' + ex.description + "\n" + ex.message,
                                true);
                            this.log('_setRootLayerSlider. onOpacityChange error stack: ' + ex.stack);
                            window.lastex = ex;
                        }
                    }
                );
            }
        }, // _setRootLayerSlider


        // return title for RootLayerNode
        _processTitle: function(rootLayer) {
            var title = this.rootLayerTOC.config.title;
            // if it is '' then it means we do not title to be shown, i.e. not indent.
            if (title === '') {
                // we do not want to show the first level, typically in the case of a single map service
                esri.hide(this.rowNode);
                rootLayer.show();
                this.rootLayerTOC._currentIndent--;
            }
            else {
                if (title === undefined) {
                    // no title is set, try to find default
                    if (rootLayer.name) {
                        // this is a featureLayer
                        title = rootLayer.name;
                    }
                    else {
                        var start = rootLayer.url.toLowerCase().indexOf('/rest/services/');
                        var end = rootLayer.url.toLowerCase().indexOf('/mapserver', start);
                        title = rootLayer.url.substring(start + 15, end);
                    }
                }
            }
            title = decodeURI(title);
            title = title.replace(/_/g, ' ');
            return title;
        }, // _processTitle


        // a layer inside a map service.
        _createServiceLayerNode: function(svcLyr) {
            // layer: layerInfo with nested subLayerInfos
            this.labelNode.innerHTML = svcLyr.name;
            if (svcLyr._subLayerInfos) {// group layer
                dojo.addClass(this.rowNode, 'agsjsTOCGroupLayer');
                dojo.addClass(this.labelNode, 'agsjsTOCGroupLayerLabel');
                this._createChildrenNodes(svcLyr._subLayerInfos, 'serviceLayer');
            }
            else {
                dojo.addClass(this.rowNode, 'agsjsTOCServiceLayer');
                dojo.addClass(this.labelNode, 'agsjsTOCServiceLayerLabel');
                if (this.rootLayer.tileInfo) {
                    // can not check on/off for tiled
                    this._noCheckNode = true;
                }
                if (svcLyr._legends && !this.rootLayerTOC.config.noLegend) {
                    if (svcLyr._legends.length == 1) {
                        this.iconNode.src = this._getLegendIconUrl(svcLyr._legends[0]);
                        dojo.destroy(this.containerNode);
                        this.containerNode = null;
                    }
                    else {
                        this._createChildrenNodes(svcLyr._legends, 'legend');
                    }
                }
                else {
                    dojo.destroy(this.iconNode);
                    this.iconNode = null;
                    dojo.destroy(this.containerNode);
                    this.containerNode = null;
                }
            }
        },
        /*
         a legend data normally have: {description,label,symbol,value}
         */
        _createLegendNode: function(rendLeg){
            this._noCheckNode = true;
            dojo.destroy(this.containerNode);
            dojo.addClass(this.labelNode, 'agsjsTOCLegendLabel');
            this._setIconNode(rendLeg, this.iconNode, this);
            var label = rendLeg.label;
            if (rendLeg.label === undefined) {
                if (rendLeg.value !== undefined) {
                    label = rendLeg.value;
                }
                if (rendLeg.maxValue !== undefined) {
                    label = '' + rendLeg.minValue + ' - ' + rendLeg.maxValue;
                }
            }
            this.labelNode.appendChild(document.createTextNode(label));
        },
        // set url or replace node
        _setIconNode: function(rendLeg, iconNode, tocNode){
            var src = this._getLegendIconUrl(rendLeg);
            if (!src) {
                if (rendLeg.symbol) {
                    var w = this.rootLayerTOC.tocWidget.swatchSize[0];
                    var h = this.rootLayerTOC.tocWidget.swatchSize[1];
                    if (rendLeg.symbol.width && rendLeg.symbol.height) {
                        w = rendLeg.symbol.width;
                        h = rendLeg.symbol.height;
                    }
                    var node = dojo.create('span', {});
                    dojo.style(node, {
                        'width': w + 'px',
                        'height': h + 'px',
                        'display': 'inline-block'
                    });
                    dojo.place(node, iconNode, 'replace');
                    tocNode.iconNode = node;
                    var descriptors = esri.symbol.getShapeDescriptors(rendLeg.symbol);
                    var mySurface = gfx.createSurface(node, w, h);//dojox.
                    if (descriptors) {
                        if (dojo.isIE) {
                            // 2013076: see	http://mail.dojotoolkit.org/pipermail/dojo-interest/2009-December/041404.html
                            window.setTimeout(dojo.hitch(this, '_createSymbol', mySurface, descriptors, w, h), 500);
                        }
                        else {
                            this._createSymbol(mySurface, descriptors, w, h);
                        }
                    }
                }
                else {
                    if (console)
                        console.log('no symbol in renderer');
                }
            }
            else {
                iconNode.src = src;
                if (rendLeg.symbol && rendLeg.symbol.width && rendLeg.symbol.height) {
                    iconNode.style.width = rendLeg.symbol.width;
                    iconNode.style.height = rendLeg.symbol.height;
                }
            }
        },


        _createSymbol: function(mySurface, descriptors, w, h) {
            try {
                var shape = mySurface.createShape(descriptors.defaultShape);
                if (descriptors.fill) {
                    shape.setFill(descriptors.fill);
                }
                if (descriptors.stroke) {
                    shape.setStroke(descriptors.stroke);
                }
                shape.applyTransform({
                    dx: w / 2,
                    dy: h / 2
                });
            }
            catch(ex) {
                vslib.log("Ошибка в процессе создания символа. \n" +
                    '_createSymbol error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_createSymbol error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _createSymbol


        _getLegendIconUrl: function(legend){
            var src = legend.url;
            // in some cases NULL value may cause #legend != #of renderer entry.
            if (src != null && src.indexOf('data') == -1) {
                if (!dojo.isIE && legend.imageData && legend.imageData.length > 0) {
                    src = "data:image/png;base64," + legend.imageData;
                }
                else {
                    if (src.indexOf('http') !== 0) {
                        // resolve relative url
                        src = this.rootLayer.url + '/' + this.serviceLayer.id + '/images/' + src;
                    }
                    if (this.rootLayer.credential && this.rootLayer.credential.token) {
                        src = src + "?token=" + this.rootLayer.credential.token;
                    }
                    else
                        if (esri.config.defaults.io.alwaysUseProxy) {
                            src = esri.config.defaults.io.proxyUrl + "?" + src;
                        }
                }
            }
            return src;
        },


        /**
         * Create children nodes, for serviceLayers, subLayers of a group layer, or legends within a serviceLayer.
         * @param {Object} chdn children nodes data
         * @param {Object} type rootLayer|serviceLayer|legend. It's name will be passed in constructor of _TOCNode.
         */
        _createChildrenNodes: function(chdn, type) {
            this.log("_createChildrenNodes. type: " + type + '; data: ');
            vslib.dir(chdn);

            this.rootLayerTOC._currentIndent++;
            var c = [];
            //dojo.forEach(chdn, function(chd) {
            for (var i = 0, n = chdn.length; i < n; i++) {
                var chd = chdn[i];
                if (type == 'legend') {
                    chd.id = 'legend' + i;
                }
                var params = {
                    rootLayerTOC:   this.rootLayerTOC,
                    rootLayer:      this.rootLayer,
                    serviceLayer:   this.serviceLayer,
                    legend:         this.legend
                };
                params[type] = chd;
                params.data = chd;

                var node = new _TOCNode(params);
                node.placeAt(this.containerNode);
                c.push(node);
            }
            this._childTOCNodes = c; // for refreshTOC use recursively.
            this.rootLayerTOC._currentIndent--;
        }, // _createChildrenNodes


        _toggleContainer: function(on){
            if (dojo.hasClass(this.iconNode, 'dijitTreeExpandoClosed') ||
            dojo.hasClass(this.iconNode, 'dijitTreeExpandoOpened')) {
                // make sure its not clicked on legend swatch
                if (on) {
                    dojo.removeClass(this.iconNode, 'dijitTreeExpandoClosed');
                    dojo.addClass(this.iconNode, 'dijitTreeExpandoOpened');
                }
                else
                    if (on === false) {
                        dojo.removeClass(this.iconNode, 'dijitTreeExpandoOpened');
                        dojo.addClass(this.iconNode, 'dijitTreeExpandoClosed');
                    }
                    else {
                        dojo.toggleClass(this.iconNode, 'dijitTreeExpandoClosed');
                        dojo.toggleClass(this.iconNode, 'dijitTreeExpandoOpened');
                    }
                if (dojo.hasClass(this.iconNode, 'dijitTreeExpandoOpened')) {
                    if (this.toggler) {
                        this.toggler.show();
                    }
                    else {
                        esri.show(this.containerNode);
                    }
                }
                else {
                    if (this.toggler) {
                        this.toggler.hide();
                    }
                    else {
                        esri.hide(this.containerNode);
                    }
                }
                // remember it's state for refresh
                if (this.rootLayer && !this.serviceLayer && !this.legend) {
                    this.rootLayerTOC.config.collapsed = dojo.hasClass(this.iconNode, 'dijitTreeExpandoClosed');
                }
            }
        },
        /**
         * Expand the node's children if applicable
         */
        expand: function(){
            this._toggleContainer(true);
        },
        /**
         * collapse the node's children if applicable
         */
        collapse: function(){
            this._toggleContainer(false);
        },
        /**
         * Show the TOC Node
         */
        show: function(){
            esri.show(this.domNode);
        },
        /** Hide TOC node
         *
         */
        hide: function(){
            esri.hide(this.domNode);
        },


        // change UI according to the state of map layers.
        _adjustToState: function() {
            //~ this.log('_adjustToState'); // agsjs.dijit._TOCNode._adjustToState
            if (this.checkNode) {
                var checked = this.legend ? this.legend.visible : this.serviceLayer ? this.serviceLayer.visible : this.rootLayer ? this.rootLayer.visible : false;
                if (this.checkNode.set) {
                    //checkNode is a dojo.forms.CheckBox
                    this.checkNode.set('checked', checked);
                }
                else {
                    // checkNode is a simple HTML element.
                    this.checkNode.checked = checked;
                }
            }
            if (this.serviceLayer) {
                var scale = esri.geometry.getScale(this.rootLayerTOC.tocWidget.map);
                var outScale = (this.serviceLayer.maxScale != 0 && scale < this.serviceLayer.maxScale) || (this.serviceLayer.minScale != 0 && scale > this.serviceLayer.minScale);
                if (outScale) {
                    dojo.addClass(this.domNode, 'agsjsTOCOutOfScale');
                }
                else {
                    dojo.removeClass(this.domNode, 'agsjsTOCOutOfScale');
                }
                if (this.checkNode) {
                    if (this.checkNode.set) {
                        this.checkNode.set('disabled', outScale);
                    }
                    else {
                        this.checkNode.disabled = outScale;
                    }
                }
            }
            if (this._childTOCNodes.length > 0) {
                dojo.forEach(this._childTOCNodes, function(child){
                    child._adjustToState();
                });
            }
        }, // _adjustToState


        _onClick: function(evt){
            var t = evt.target;
            var lay;
            if (t == this.checkNode || dijit.getEnclosingWidget(t) == this.checkNode) {
                // 2013-07-23: remove this most complex checkable legend functionality to simplify the widget
                if (this.serviceLayer) {
                    this.serviceLayer.visible = this.checkNode && this.checkNode.checked;
                    // if a sublayer is checked on, force it's group layer to be on.
                    // 2013-08-01 handler multiple level of groups
                    if (this.serviceLayer.visible) {
                        lay = this.serviceLayer;
                        while (lay._parentLayerInfo) {
                            if (!lay._parentLayerInfo.visible) {
                                lay._parentLayerInfo.visible = true;
                            }
                            lay = lay._parentLayerInfo;
                        }
                    }
                    // if a layer is on, it's service must be on.
                    if (this.serviceLayer.visible && !this.rootLayer.visible) {
                        this.rootLayer.show();
                    }
                    if (this.serviceLayer._subLayerInfos) {
                        // this is a group layer;
                        // 2013-08-01 handler multiple level of groups
                        this._setSubLayerVisibilitiesFromGroup(this.serviceLayer);
                    }
                    /* 2013-07-23: do not deal with checkbox legend any more.*/
                    this.rootLayer.setVisibleLayers(this._getVisibleLayers(), true);
                    this.rootLayerTOC._refreshLayer();
                }
                else
                    if (this.rootLayer) {
                        this.rootLayer.setVisibility(this.checkNode && this.checkNode.checked);
                    }
                // automatically expand/collapse?
                if (this.rootLayerTOC.config.autoToggle !== false) {
                    this._toggleContainer(this.checkNode && this.checkNode.checked);
                }
                this.rootLayerTOC._adjustToState();

            }
            else
                if (t == this.iconNode) {
                    this._toggleContainer();
                }
        },
        _setSubLayerVisibilitiesFromGroup: function(lay){
            if (lay._subLayerInfos && lay._subLayerInfos.length > 0) {
                dojo.forEach(lay._subLayerInfos, function(info){
                    info.visible = lay.visible;
                    if (info._subLayerInfos && info._subLayerInfos.length > 0) {
                        this._setSubLayerVisibilitiesFromGroup(info);
                    }
                }, this);
            }
        },
        _getVisibleLayers: function(){
            var vis = [];
            dojo.forEach(this.rootLayer.layerInfos, function(layerInfo){
                if (layerInfo.subLayerIds) {
                    // if a group layer is set to vis, all sub layer will be drawn regardless it's sublayer status
                    return;
                }
                else
                    if (layerInfo.visible) {
                        vis.push(layerInfo.id);
                    }
            });
            if (vis.length === 0) {
                vis.push(-1);
            }
            else
                if (!this.rootLayer.visible) {
                    this.rootLayer.show();
                }
            return vis;
        },
        _findTOCNode: function(layerId){
            if (this.serviceLayer && this.serviceLayer.id == layerId) {
                return this;
            }
            if (this._childTOCNodes.length > 0) {
                var n = null;
                for (var i = 0, c = this._childTOCNodes.length; i < c; i++) {
                    n = this._childTOCNodes[i]._findTOCNode(layerId);
                    if (n)
                        return n;
                }
            }
            return null;
        },

        log: function(str, doalert) {
            vslib.log('agsjs.dijit._TOCNode.' + str, doalert);
        } // log
    });


    /// dojo.declare('agsjs.dijit._RootLayerTOC', [dijit._Widget], {
    var _RootLayerTOC = declare([_Widget], {
        _currentIndent: 0,
        rootLayer: null, // layer info
        tocWidget: null, // parent widget

        /**
         *
         * @param {Object} params is {noLegend: true|false, collapsed: true|false, slider: true|false}
         * @param {Object} srcNodeRef
         */
        constructor: function(params, srcNodeRef){
            this.config = params.config || {};
            this.rootLayer = params.config.layer;
            this.tocWidget = params.tocWidget;
        },


        // extenstion point called by framework
        postCreate: function() {
            this.log('postCreate');
            try {
                if ((this.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer) ||
                    this.rootLayer instanceof (esri.layers.ArcGISTiledMapServiceLayer)))
                {
                    this.log("postCreate. got MapServiceLayer, ask for legend");
                    if (this._legendResponse) {
                        this._createRootLayerTOC();
                    }
                    else {
                        this._getLegendInfo();
                    }
                }
                else {
                    this._createRootLayerTOC();
                }
            }
            catch(ex) {
                vslib.log("Ошибка в процессе создания корневого узла легенды. \n" +
                    'postCreate error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('postCreate error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // postCreate


        _getLegendInfo: function(soapFail) {
            this.log('_getLegendInfo. service version: ' + this.rootLayer.version);
            var url = '';
            if ((this.rootLayer.version && this.rootLayer.version >= 10.01) || soapFail) {
                url = this.rootLayer.url + '/legend';
                this.soapQuery = false;
            }
            else { // soapQuery
                url = 'http://www.arcgis.com/sharing/tools/legend';
                var i = this.rootLayer.url.toLowerCase().indexOf('/rest/');
                var soap = this.rootLayer.url.substring(0, i) + this.rootLayer.url.substring(i + 5);
                url = url + '?soapUrl=' + encodeURIComponent(soap);
                this.soapQuery = url;
            }
            this.log('_getLegendInfo. url: ' + url);

            var req = esri.request({
                url: url,
                content: {
                    f: "json"
                },
                callbackParamName: 'callback',
                handleAs: 'json',
                load: dojo.hitch(this,
                        function(resp) {
                            try {
                                this._processLegendInfo(resp);
                                this._createRootLayerTOC();
                            }
                            catch(ex) {
                                vslib.log("Ошибка в процессе запроса легенды с сервера. \n" +
                                    '_processLegendInfo error: ' + ex.description + "\n" + ex.message,
                                    true);
                                this.log('_processLegendInfo error stack: ' + ex.stack);
                                window.lastex = ex;
                            }
                        }
                    ),
                error: dojo.hitch(this, this._processLegendError)
            }); // esri.request
            console.debug("_getLegendInfo. req: ", req);
        }, // _getLegendInfo


        _processLegendError: function(err) {
            try {
                this.log('_processLegendError: ');
                vslib.dir(err);
                if(this.soapQuery) this._getLegendInfo(true);
            }
            catch(ex) {
                vslib.log("Ошибка в процессе запроса легенды с сервера. \n" +
                    '_processLegendError error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_processLegendError error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _processLegendError


        _processLegendInfo: function(json) {
            this.log('_processLegendInfo: ');
            vslib.dir(json);

            this._legendResponse = json;
            var layer = this.rootLayer;
            if (layer._tocInfos) {
                return;
            }

            // create a lookup map, key=layerId, value=LayerInfo
            // generally id = index, this is to assure we find the right layer by ID
            // note: not all layers have an entry in legend response.
            var layerLookup = {};
            dojo.forEach(layer.layerInfos,
                function(layerInfo) {
                    //2012-07-21: if setVisibility is called before this widget is built, we want to use the actual visibility instead of the layerInfo.
                    // used for later reference.
                    layerInfo.visible = layerInfo.defaultVisibility;
                    if (layer.visibleLayers && !layerInfo.subLayerIds) {
                        if (dojo.indexOf(layer.visibleLayers, layerInfo.id) == -1) {
                            layerInfo.visible = false;
                        }
                        else {
                            layerInfo.visible = true;
                        }
                    }
                    layerLookup['' + layerInfo.id] = layerInfo;
                }
            ); // forEach sublayer

            // attach legend Info to layer info
            if (json.layers) {
                dojo.forEach(json.layers,
                    function(legInfo){
                        var layerInfo = layerLookup['' + legInfo.layerId];
                        if (layerInfo && legInfo.legend) {
                            layerInfo._legends = legInfo.legend;
                        }
                    }
                ); // forEach layer legend
            }

            // nested layer Infos
            dojo.forEach(layer.layerInfos,
                function(layerInfo){
                    if (layerInfo.subLayerIds) {
                        var subLayerInfos = [];
                        dojo.forEach(layerInfo.subLayerIds, function(id, i) {
                            subLayerInfos[i] = layerLookup[id];
                            subLayerInfos[i]._parentLayerInfo = layerInfo;
                        });
                        layerInfo._subLayerInfos = subLayerInfos;
                    }
                }
            ); // forEach sublayer

            //finalize the tree structure in _tocInfos, skipping all sublayers because they were nested already.
            var tocInfos = [];
            dojo.forEach(layer.layerInfos, function(layerInfo) {
                if (layerInfo.parentLayerId == -1) { // only first level
                    tocInfos.push(layerInfo);
                }
            });
            this.rootLayer._tocInfos = tocInfos;

            this.log('_processLegendInfo, _tocInfos: ');
            vslib.dir(this.rootLayer._tocInfos);
        }, // _processLegendInfo


        _createRootLayerTOC: function() {
            this.log('_createRootLayerTOC');
            try {
                this._loaded = false;
                // sometimes IE may fail next step
                ///this._rootLayerNode = new agsjs.dijit._TOCNode({
                if (this.rootLayer.loaded && map.loaded) {
                    this.log('_createRootLayerTOC rootLayer and map is loaded');
                    this._rootLayerNode = new _TOCNode({
                        rootLayerTOC: this,
                        rootLayer: this.rootLayer
                    });
                    this._rootLayerNode.placeAt(this.domNode);

                    this._setEventHandlers();
                    this._adjustToState();
                    this.onLoad();
                    this._destroyTempNode();
                    this._loaded = true;
                }
                else {
                    this.log('_createRootLayerTOC rootLayer or map not loaded');
                    setTimeout(dojo.hitch(this,
                        function() {
                            this.log('_createRootLayerTOC try after pause');
                            this._createRootLayerTOC();
                        }
                    ), 300);
                }
            }
            catch(ex) {
                vslib.log("Ошибка в процессе создания корневого узла легенды. \n" +
                    '_createRootLayerTOC error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_createRootLayerTOC error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _createRootLayerTOC


        _destroyTempNode: function() {
            if(!dojo.isIE) {
                dojo.destroy(this.id + '_load');
                return;
            }

            this.log("_destroyTempNode");
            setTimeout(dojo.hitch(this, function() {
                try {
                    this.log("_destroyTempNode. id for delete: " + this.id + '_load'); //rootLayerTOC.id + '_load'
                    dojo.destroy(this.id + '_load');
                }
                catch(ex) {
                    vslib.log("Ошибка в процессе зачистки временных элементов. \n" +
                        '_destroyTempNode error: ' + ex.description + "\n" + ex.message,
                        true);
                    this.log('_destroyTempNode error stack: ' + ex.stack);
                    window.lastex = ex;
                }
            }), 999);
        }, // _destroyTempNode


        _setEventHandlers: function() {
            this.log("_setEventHandlers");
            if(this._visHandler) { ; }
            else { this._visHandler = dojo.connect(this.rootLayer, "onVisibilityChange", this, "_adjustToState"); }

            // this will make sure all TOC linked to a Map synchronized.
            if (this.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer)) {
                if(this._visLayerHandler) { ; }
                else { this._visLayerHandler = dojo.connect(this.rootLayer, "setVisibleLayers", this, "_onSetVisibleLayers"); }
            }
        }, // _setEventHandlers


        /**
         * @event
         */
        onLoad: function(){
            this.log('onLoad');
        },


        _refreshLayer: function() {
            this.log("_refreshLayer");
            var rootLayer = this.rootLayer;
            var timeout = this.tocWidget.refreshDelay;
            if (this._refreshTimer) {
                window.clearTimeout(this._refreshTimer);
                this._refreshTimer = null;
            }
            this._refreshTimer = window.setTimeout(function(){
                rootLayer.setVisibleLayers(rootLayer.visibleLayers);
            }, timeout);
        }, // _refreshLayer


        _onSetVisibleLayers: function(visLayers, doNotRefresh) {
            this.log("_onSetVisibleLayers");
            try {
                // 2012-07-23:
                // set the actual individual layerInfo's visibility after service's setVisibility call.
                if (doNotRefresh) {
                    return;
                }
                dojo.forEach(this.rootLayer.layerInfos, function(layerInfo) {
                    if (dojo.indexOf(visLayers, layerInfo.id) != -1) {
                        layerInfo.visible = true;
                    }
                    else {
                        if (!layerInfo._subLayerInfos) {
                            layerInfo.visible = false;
                        }
                    }
                });
                this._adjustToState();
            }
            catch(ex) {
                vslib.log("Ошибка в процессе переключения видимости слоев. \n" +
                    '_onSetVisibleLayers error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_onSetVisibleLayers error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _onSetVisibleLayers


        _adjustToState: function() {
            try {
                // _TOCNode
                if(this._loaded && this._rootLayerNode) {
                    this.log('_adjustToState. _rootLayerNode: ' + this._rootLayerNode.id); // agsjs.dijit._RootLayerTOC._adjustToState
                    //~ vslib.dir(this._rootLayerNode);
                    this._rootLayerNode._adjustToState();
                }
            }
            catch(ex) {
                vslib.log("Ошибка в процессе отрисовки состояния слоя. \n" +
                    '_adjustToState error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_adjustToState error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _adjustToState


        destroy: function() {
            this.log("destroy");
            if(this._visHandler) {
                dojo.disconnect(this._visHandler);
                this._visHandler = '';
            }

            if (this._visLayerHandler) {
                dojo.disconnect(this._visLayerHandler);
                this._visLayerHandler = '';
            }
        }, // destroy


        log: function(str, doalert) {
            vslib.log('agsjs.dijit._RootLayerTOC.' + str, doalert);
        } // log
    }); // var _RootLayerTOC


    // dojo.declare("agsjs.dijit.TOC", [dijit._Widget], {
    var TOC = declare("agsjs.dijit.TOC", [_Widget], {
        indentSize: 18,
        swatchSize: [30, 30],
        refreshDelay: 500,
        layerInfos: null,

        /**
         * @name TOCLayerInfo
         * @class This is an object literal that specify the options for each map rootLayer layer.
         * @property {Layer} [layer] ArcGIS Server layer.
         * @property {string} [title] title. optional. If not specified, rootLayer name is used.
         * @property {Boolean} [slider] whether to show slider for each rootLayer to adjust transparency. default is false.
         * @property {Boolean} [noLegend] whether to skip the legend, and only display layers. default is false.
         * @property {Boolean} [collapsed] whether to collapsed the rootLayer layer at beginning. default is false, which means expand if visible, collapse if not.
         *
         */
        /**
         * @name TOCOptions
         * @class This is an object literal that specify the option to construct a {@link TOC}.
         * @property {esri.Map} [map] the map instance. required.
         * @property {Object[]} [layerInfos] a subset of layers in the map to show in TOC. each object is a {@link TOCLayerInfo}
         * @property {Number} [indentSize] indent size of tree nodes. default to 18.
         */
        /**
         * Create a Table Of Contents (TOC)
         * @name TOC
         * @constructor
         * @class This class is a Table Of Content widget.
         * @param {ags.TOCOptions} opts
         * @param {DOMNode|id} srcNodeRef
         */
        constructor: function(params, srcNodeRef){
            params = params || {};
            if (!params.map) {
                throw new Error('no map defined in params for TOC');
            }
            this.layerInfos = params.layerInfos.reverse();
            dojo.mixin(this, params);
        },

        // extension point
        postCreate: function() {
            this.log('postCreate');
            try {
                this._createTOC();
            }
            catch(ex) {
                vslib.log("Ошибка в процессе создания легенды. \n" +
                    'postCreate error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('postCreate error stack: ' + ex.stack);
                window.lastex = ex;
            }
        },

        /** @event the widget DOM is loaded
         *
         */
        onLoad: function() {
            this.log('onLoad');
        },


        _createTOC: function() {
            this.log('_createTOC for layers: ' + this.layerInfos.length);

            dojo.empty(this.domNode);
            this._rootLayerTOCs = [];

            for (var i = 0, c = this.layerInfos.length; i < c; i++) {
                // attach a title to rootLayer layer itself
                var info = this.layerInfos[i];
                var rootLayerTOC = new _RootLayerTOC({
                    config: info,
                    tocWidget: this
                });
                this._rootLayerTOCs.push(rootLayerTOC);

                this.log("_createTOC. appendChild, id = rootLayerTOC.id + '_load': " + rootLayerTOC.id + '_load');
                this.domNode.appendChild(dojo.create("div", {
                    innerHTML: '<img src="images/loading_black.gif" />' + (decodeURI(info.title)).replace(/_/g, ' '),
                    class: 'agsjsTOCRootLayerLabel',
                    style: 'margin: 1px 40px 4px 17px;',
                    id: rootLayerTOC.id + '_load'
                }));

                rootLayerTOC._checkLoadHandler = dojo.connect(rootLayerTOC, 'onLoad', this, '_checkLoad');
                rootLayerTOC.placeAt(this.domNode);
            } // end forEach layer

            if (this.layerInfos.length == 0) {
                var emptyTOC = '<h2>Быстрый старт</h2>\n' +
                '<p>Для того чтобы добавить слои на карту воспользуйтесь кнопкой <i>«Добавить»</i>.</p>\n' +
                '<p>Для изменения базового слоя нужно воспользоваться кнопкой <i>«Базовая карта»</i>.</p>\n' +
                '<p>Полную справку о программе можно получить здесь - <a href="http://cgis.allgis.org/miniportal/documentation/help.html" target="_blank">http://cgis.allgis.org/miniportal/documentation/help.html</a>.</p>\n' +
                '<hr /><p>© 2013 ALGIS LLC<br />С вопросами и предложениями обращайтесь по адресу <a href="mailto:mp@allgis.org?subject=miniportal">mp@allgis.org</a></p>\n';
                this.domNode.innerHTML = emptyTOC;
            }

            // events
            setTimeout(
                dojo.hitch(this,
                    function() {
                        this._setEventHandlers();
                    }
                ),
                100
            );
        }, // _createTOC


        _setEventHandlers: function() {
            this.log('_setEventHandlers');
            /*
                dojo.disconnect(this._zoomHandler);
                dojo.disconnect(this._layerAdd);
                dojo.disconnect(this._layersReordered);
            */
            try {
                if (!this._zoomHandler) {
                    this._zoomHandler = dojo.connect(this.map, "onZoomEnd", this,
                        function() {
                            this.log('map event onZoomEnd');
                            this._adjustToState();
                        }
                    );
                }

                if (!this._layersReordered) {
                    this._layersReordered = dojo.connect(this.map, 'onLayersReordered', this,
                        function(layerIds) {
                            this.log('map event onLayersReordered');
                            this.refresh();
                        }
                    );
                }

                if (!this._layerAdd) {
                    this._layerAdd = dojo.connect(this.map, 'onLayerAddResult', this,
                        function(layer) {
                            this.log('map event onLayerAddResult');
                            this.refresh();
                        }
                    );
                }

                this._checkLoad();
            }
            catch(ex) {
                vslib.log("Ошибка в процессе установки событий. \n" +
                    '_setEventHandlers error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_setEventHandlers error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _setEventHandlers


        _checkLoad: function() {
            this.log('_checkLoad');
            var loaded = true;
            try {
                dojo.every(this._rootLayerTOCs, function(widget) {
                    if (!widget._loaded) {
                        loaded = false;
                        return false;
                    }
                    return true;
                });
                if (loaded) {
                    this.onLoad();
                }
            }
            catch(ex) {
                vslib.log("Ошибка в процессе проверки прогресса загрузки. \n" +
                    '_checkLoad error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_checkLoad error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _checkLoad


        _adjustToState: function() {
            try {
                this.log('_adjustToState. _rootLayerTOCs:' ); // agsjs.dijit.TOC._adjustToState
                vslib.dir(this._rootLayerTOCs);

                dojo.forEach(this._rootLayerTOCs, function(widget){
                    widget._adjustToState();
                });
            }
            catch(ex) {
                vslib.log("Ошибка в процессе синхронизации виджетов. \n" +
                    '_adjustToState error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('_adjustToState error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // _adjustToState


        // return layerInfos list created from map layers
        //var layerInfosNew = this.makeLayerInfosList(map);
        makeLayerInfosList: function(map) {
            this.log('makeLayerInfosList');
            var res = [];

            for(ind in map.layerIds) {
                //this.log('makeLayerInfosList. ind: ' + ind + '; map.layerIds[ind]: ' + map.layerIds[ind]);
                var lyr = map.getLayer(map.layerIds[ind]);
                if(vslib.isBasemapLayer(map, lyr)) {
                    this.log('makeLayerInfosList. isBasemapLayer: ' + lyr.id);
                    continue;
                }
                this.log('makeLayerInfosList. lyr not isBasemapLayer: ' + lyr.id);

                // make layerInfo
                var layerTitle = 'unnamed';
                if (lyr.arcgisProps) {
                    if (lyr.arcgisProps.title) layerTitle = lyr.arcgisProps.title;
                }
                else {
                    if (lyr.url) {
                        layerTitle = lyr.url.split('/');
                        layerTitle = layerTitle[layerTitle.length - 2];
                    }
                }
                res.push({
                    layer: lyr,
                    title: layerTitle,
                    collapsed: true,
                    autoToggle: false
                });
            } // end forEach map layers

            return res.reverse();
        }, // makeLayerInfosList


        /*
         Synchronize TOC content with layers in map
         */
        _syncTOC: function() {
            /*
                in: map events about change in layers list
                out: return true if there is a change, false if layers list not really changed;
                    set this.layerInfos - array of objects containing layer metadata
            */
            this.log('_syncTOC');

            var layerInfosNew = this.makeLayerInfosList(map);
            this.log('_syncTOC. layerInfosNew: ' + layerInfosNew.length);
            vslib.dir(layerInfosNew);

            if (this.layerInfos.length != layerInfosNew.length) {
                this.log('_syncTOC. this.layerInfos updated, length diff');
                this.layerInfos = layerInfosNew;
                return true;
            }

            for (ind in this.layerInfos) {
                if (this.layerInfos[ind].layer.id != layerInfosNew[ind].layer.id) {
                    this.log('_syncTOC. this.layerInfos updated, content diff');
                    this.layerInfos = layerInfosNew;
                    return true;
                }
            }

            this.log('_syncTOC. this.layerInfos still the same');
            return false;
        }, // _syncTOC


        /**
         * Refresh the TOC to reflect changes in layers list
         */
        refresh: function(force) {
            this.log('refresh. force: ', arguments);
            setTimeout(dojo.hitch(this, // map have to be ready
                function() {
                    try {
                        this.log('delayed refresh. ', arguments);
                        if (this._syncTOC() || force) {
                            this.destroy();
                            this._createTOC();
                        }
                    }
                    catch(ex) {
                        vslib.log("Ошибка в процессе перерисовки виджетов. \n" +
                            'refresh error: ' + ex.description + "\n" + ex.message,
                            true);
                        this.log('refresh error stack: ' + ex.stack);
                        window.lastex = ex;
                    }
                }),
                333
            );
        }, // refresh


        destroy: function() {
            this.log('destroy');
            try {
                dojo.disconnect(this._zoomHandler);
                this._zoomHandler = null;

                dojo.disconnect(this._layerAdd);
                this._layerAdd = null;

                dojo.disconnect(this._layersReordered);
                this._layersReordered = null;
            }
            catch(ex) {
                vslib.log("Ошибка в процессе удаления виджета. \n" +
                    'destroy error: ' + ex.description + "\n" + ex.message,
                    true);
                this.log('destroy error stack: ' + ex.stack);
                window.lastex = ex;
            }
        }, // destroy


        /**
         * Find the TOC Node based on root layer and optional serviceLayer ID.
         * @param {Object} layer root Layer of a map
         * @param {Object} serviceLayerId id of a ArcGIS Map Service Layer
         * @return {TOCNode} TOC node, it has public methods: collapse, expand, show, hide
         */
        findTOCNode: function(layer, serviceLayerId){
            var w = null;
            dojo.every(this._rootLayerTOCs, function(widget) {
                if (widget.rootLayer == layer) {
                    w = widget;
                    return false;
                }
                return true;
            });
            if (w && serviceLayerId !== null && serviceLayerId !== undefined
                && w.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer))
            {
                return w._rootLayerNode._findTOCNode(serviceLayerId);
            }
            else
                if (w) {
                    return w._rootLayerNode;
                }
            return null;
        },

        log: function(str, doalert) {
            vslib.log('agsjs.dijit.TOC.' + str, doalert);
        } // log
    });
    return TOC;

});
