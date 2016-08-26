/**
 * @name Table of Contents (TOC) widget for ArcGIS Server JavaScript API
 * @author: Nianwei Liu
 * @fileoverview
 * <p>A TOC (Table of Contents) widget for ESRI ArcGIS Server JavaScript API. The namespace is <code>agsjs</code></p>
 */
// change log: 
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

define("agsjs/dijit/TOC", ['dojo/_base/declare','dijit/_Widget','dijit/_Templated','dojox/gfx','dojo/fx/Toggler','dijit/form/Slider'], function(declare, _Widget,_Templated, gfx, Toggler){
///dojo.provide('agsjs.dijit.TOC');
///dojo.require("dojo.fx.Toggler");
///dojo.require('dijit._Widget');
///dojo.require('dijit._Templated');
///dojo.require('dijit.form.Slider');

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
 var _TOCNode = declare([_Widget, _Templated],{
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
    postCreate: function(){
      dojo.style(this.rowNode, 'paddingLeft', '' + this.rootLayerTOC.tocWidget.indentSize * this.rootLayerTOC._currentIndent + 'px');
      // using the availability of certain property to decide what kind of node to create.
      // priority is legend/serviceLayer/rootLayer
      this.data = this.legend || this.serviceLayer || this.rootLayer;
      this.blank = this.iconNode.src;
      if (this.legend) {
        this._createLegendNode(this.legend);
      } else if (this.serviceLayer) {
        this._createServiceLayerNode(this.serviceLayer);
      } else if (this.rootLayer) {
        this._createRootLayerNode(this.rootLayer);
      }
      if (this.containerNode && Toggler) {// dojo.fx.
        // if containerNode was not removed, it means this is some sort of group.
        this.toggler = new Toggler({ //dojo.fx.
          node: this.containerNode,
          showFunc: dojo.fx.wipeIn,
          hideFunc: dojo.fx.wipeOut
        })
      }
      if (!this._noCheckNode) {
        // typically _noCheckNode means it is a tiledlayer, or legend item that should not have a checkbox
        var chk;
        if (dijit.form && dijit.form.CheckBox) {
          chk = new dijit.form.CheckBox({ // looks a bug in dijit. image not renderered until mouse over. bug was closed but still exist.
            // use attr('checked', true) not working either.
            checked: this.data.visible
          });
          chk.placeAt(this.checkContainerNode);
          chk.startup();
        } else {
          chk = dojo.create('input', {
            type: 'checkbox',
            checked: this.data.visible
          }, this.checkContainerNode);
        }
        this.checkNode = chk;
      }
      var showChildren = this.data.visible;
      // if it is a group layer and no child layer is visible, then collapse
      if (this.data._subLayerInfos) {
        var noneVisible = true;
        dojo.every(this.data._subLayerInfos, function(info){
          if (info.visible) {
            noneVisible = false;
            return false;
          }
          return true;
        });
        if (noneVisible) 
          showChildren = false;
      }
      if (this.data.collapsed) 
        showChildren = false;
      if (this.iconNode && this.iconNode.src == this.blank) {
        dojo.addClass(this.iconNode, 'dijitTreeExpando');
        dojo.addClass(this.iconNode, showChildren ? 'dijitTreeExpandoOpened' : 'dijitTreeExpandoClosed');
      }
	  if (this.iconNode){
	  	dojo.addClass(this.iconNode, 'agsjsTOCIcon');
	  }
      if (this.containerNode) {
        dojo.style(this.containerNode, 'display', showChildren ? 'block' : 'none');
      }
	  this.domNode.id = 'TOCNode_'+this.rootLayer.id + (this.serviceLayer?'_'+this.serviceLayer.id:'')+(this.legend?'_'+this.legend.id:'');
    },
    // root level node, layers directly under esri.Map
    _createRootLayerNode: function(rootLayer){
      dojo.addClass(this.rowNode, 'agsjsTOCRootLayer');
      dojo.addClass(this.labelNode, 'agsjsTOCRootLayerLabel');
      var title = this.rootLayerTOC.config.title;
      if (title === '') {
        // we do not want to show the first level, typically in the case of a single map service
        esri.hide(this.rowNode);
        rootLayer.show();
        this.rootLayerTOC._currentIndent--;
      }
      rootLayer.collapsed = this.rootLayerTOC.config.collapsed;
      if (this.rootLayerTOC.config.slider) {
        this.sliderNode = dojo.create('div', {
          'class': 'agsjsTOCSlider'
        }, this.rowNode, 'last');//
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
        dojo.connect(rootLayer, 'onOpacityChange', this, function(op){
          this.slider.setValue(op * 100);
        });
      }
      if (!this.rootLayerTOC.config.noLegend) {
        if (rootLayer._tocInfos) {
          this._createChildrenNodes( rootLayer._tocInfos, 'serviceLayer');
        } else if (rootLayer.renderer) {
          // for feature layers
          var r = rootLayer.renderer;
          if (r.infos) {
            //UniqueValueRenderer |ClassBreaksRenderer
            var legs = r.infos;
            if (r.defaultSymbol && legs.length > 0 && legs[0].label != '[all other values]') {
              // insert at top
              legs.unshift({
                label: '[all other values]',
                symbol: r.defaultSymbol
              })
            }
            var af = r.attributeField + (r.normalizationField ? '/' + r.normalizationField : '');
            af += (r.attributeField2 ? '/' + r.attributeField2 : '') + (r.attributeField3 ? '/' + r.attributeField3 : '');
            var anode = dojo.create('div', {}, this.containerNode);
            dojo.style(anode, 'paddingLeft', '' + this.rootLayerTOC.tocWidget.indentSize * (this.rootLayerTOC._currentIndent + 2) + 'px');
            anode.innerHTML = af;
            this._createChildrenNodes(legs, 'legend');
          } else {
            this._createChildrenNodes([rootLayer.renderer], 'legend');
          }
          
        } else {
          dojo.style(this.iconNode, 'visibility', 'hidden');
        }
      } else {
        // no legend means no need for plus/minus sign
        dojo.style(this.iconNode, 'visibility', 'hidden');
      }
      this.labelNode.innerHTML = title;
      dojo.attr(this.rowNode, 'title', title);

        //console.log(rootLayer.id);
        //console.dir(this.rootLayerTOC.tocWidget.layerInfos);
        //console.dir(map.layerIds);
        var indexUp = null;
        var indexDown = null;
        var styleUp = '';
        var styleDown = '';
        var count = this.rootLayerTOC.tocWidget.layerInfos.length;
        for (var i = 0; i < count; i++) {
            if (this.rootLayerTOC.tocWidget.layerInfos[i].layer.id == rootLayer.id) {
                if (count == 1) {
                    styleUp = 'cursor: default; opacity: 0.3;';
                    styleDown = 'cursor: default; opacity: 0.3;';
                } else if (i == 0) {
                    styleUp = 'cursor: default; opacity: 0.3;';
                    indexDown = count - 1;
                } else if (i == this.rootLayerTOC.tocWidget.layerInfos.length - 1) {
                    styleDown = 'cursor: default; opacity: 0.3;';
                    indexUp = 2;
                } else {
                    indexUp = count - i + 1;
                    indexDown = count - i - 1;
                }
                break;
            }
        };

        this.layerMenu = new dijit.DropDownMenu();
        var menuItemZoomTo = new dijit.MenuItem({
            label: 'Приблизить',
            iconClass: 'iconZoomTo',
            onClick: function(){
                esri.config.defaults.geometryService.project([rootLayer.fullExtent], map.spatialReference,
                    function (res) {
                        map.setExtent(res[0]);
                    },
                    function (err) {
                        console.log("Project failed:  ", err);
                    }
                );
            }
        });
        this.layerMenu.addChild(menuItemZoomTo);

        var menuItemMoveUp = new dijit.MenuItem({
            label: 'Выше',
            iconClass: 'iconMoveUp',
            style: styleUp,
            onClick: function(){ if (indexUp == null) { return false; } else { map.reorderLayer(rootLayer, indexUp); } }
        });
        this.layerMenu.addChild(menuItemMoveUp);

        var menuItemMoveDown = new dijit.MenuItem({
            label: 'Ниже',
            iconClass: 'iconMoveDown',
            style: styleDown,
            onClick: function(){ if (indexDown == null) { return false; } else { map.reorderLayer(rootLayer, indexDown); } }
        });
        this.layerMenu.addChild(menuItemMoveDown);

        var menuItemRemove = new dijit.MenuItem({
            label: 'Удалить слой',
            iconClass: 'iconRemove',
            onClick: function(){ map.removeLayer(rootLayer); }
        });
        this.layerMenu.addChild(menuItemRemove);

        var menuItemDescription = new dijit.MenuItem({
            label: '<a href="' + rootLayer.url + '" target="_blank">Описание</a>',
            iconClass: 'iconDescription',
            style: 'cursor: default',
            onClick: function(evt) { this.firstChild.click(this, evt); }
        });
        this.layerMenu.addChild(menuItemDescription);

        this.layerConfigButton = new dijit.form.DropDownButton({
            iconClass: 'iconConfigure',
            title: 'Настроить',
            dropDown: this.layerMenu,
            style: 'float: right; margin: 0;'
        });
        this.layerConfigButton.placeAt(this.configNode);

    },
    // a layer inside a map service.
    _createServiceLayerNode: function(serviceLayer){
      // layer: layerInfo with nested subLayerInfos
      this.labelNode.innerHTML = serviceLayer.name;
      if (serviceLayer._subLayerInfos) {// group layer
        dojo.addClass(this.rowNode, 'agsjsTOCGroupLayer');
        dojo.addClass(this.labelNode, 'agsjsTOCGroupLayerLabel');
        this._createChildrenNodes(serviceLayer._subLayerInfos, 'serviceLayer');
      } else {
        dojo.addClass(this.rowNode, 'agsjsTOCServiceLayer');
        dojo.addClass(this.labelNode, 'agsjsTOCServiceLayerLabel');
        if (this.rootLayer.tileInfo) {
          // can not check on/off for tiled
          this._noCheckNode = true;
        }
        if (serviceLayer._legends && !this.rootLayerTOC.config.noLegend) {
		  if (serviceLayer._legends.length == 1) { 
            this.iconNode.src = this._getLegendIconUrl(serviceLayer._legends[0]);
            dojo.destroy(this.containerNode);
            this.containerNode = null;
          } else {
            this._createChildrenNodes(serviceLayer._legends, 'legend');
          }
        } else {
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
      if (!src) {//} || this.rootLayerTOC.info.mode == 'layers') {
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
            } else {
              this._createSymbol(mySurface, descriptors, w, h);
            }
          }
        } else {
          if (console) 
            console.log('no symbol in renderer');
        }
      } else {
        iconNode.src = src;
        if (rendLeg.symbol && rendLeg.symbol.width && rendLeg.symbol.height) {
          iconNode.style.width = rendLeg.symbol.width;
          iconNode.style.height = rendLeg.symbol.height;
        }
      }
    },
    _createSymbol: function(mySurface, descriptors, w, h){
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
	 
    },
    _getLegendIconUrl: function(legend){
      var src = legend.url;
      // in some cases NULL value may cause #legend != #of renderer entry.
      if (src != null && src.indexOf('data') == -1) {
        if (!dojo.isIE && legend.imageData && legend.imageData.length > 0) {
          src = "data:image/png;base64," + legend.imageData;
        } else {
          if (src.indexOf('http') !== 0) {
            // resolve relative url
            src = this.rootLayer.url + '/' + this.serviceLayer.id + '/images/' + src;
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
    _createChildrenNodes: function(chdn, type){
      this.rootLayerTOC._currentIndent++;
      var c = [];
      //dojo.forEach(chdn, function(chd) {
      for (var i = 0, n = chdn.length; i < n; i++) {
        var chd = chdn[i];
        var params = {
          rootLayerTOC: this.rootLayerTOC,
          rootLayer: this.rootLayer,
          serviceLayer: this.serviceLayer,
          legend: this.legend
        };
        params[type] = chd;
        params.data = chd;
        //var node = new agsjs.dijit._TOCNode(params);
		if (type=='legend'){
			chd.id = 'legend'+i;
		}
		var node = new _TOCNode(params);
        node.placeAt(this.containerNode);
        c.push(node);
      }
      this._childTOCNodes = c; // for refreshTOC use recursively.
      this.rootLayerTOC._currentIndent--;
    },
    _toggleContainer: function(on){
      if (dojo.hasClass(this.iconNode, 'dijitTreeExpandoClosed') ||
      dojo.hasClass(this.iconNode, 'dijitTreeExpandoOpened')) {
        // make sure its not clicked on legend swatch
        if (on) {
          dojo.removeClass(this.iconNode, 'dijitTreeExpandoClosed');
          dojo.addClass(this.iconNode, 'dijitTreeExpandoOpened');
        } else if (on === false) {
          dojo.removeClass(this.iconNode, 'dijitTreeExpandoOpened');
          dojo.addClass(this.iconNode, 'dijitTreeExpandoClosed');
        } else {
          dojo.toggleClass(this.iconNode, 'dijitTreeExpandoClosed');
          dojo.toggleClass(this.iconNode, 'dijitTreeExpandoOpened');
        }
        if (dojo.hasClass(this.iconNode, 'dijitTreeExpandoOpened')) {
          if (this.toggler) {
            this.toggler.show();
          } else {
            esri.show(this.containerNode);
          }
        } else {
          if (this.toggler) {
            this.toggler.hide();
          } else {
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
    _adjustToState: function(){
      if (this.checkNode) {
        var checked = this.legend ? this.legend.visible : this.serviceLayer ? this.serviceLayer.visible : this.rootLayer ? this.rootLayer.visible : false;
        if (this.checkNode.set) {
          //checkNode is a dojo.forms.CheckBox
          this.checkNode.set('checked', checked);
        } else {
          // checkNode is a simple HTML element.
          this.checkNode.checked = checked;
        }
      }
      if (this.serviceLayer) {
        var scale = esri.geometry.getScale(this.rootLayerTOC.tocWidget.map);
        var outScale = (this.serviceLayer.maxScale != 0 && scale < this.serviceLayer.maxScale) || (this.serviceLayer.minScale != 0 && scale > this.serviceLayer.minScale);
        if (outScale) {
          dojo.addClass(this.domNode, 'agsjsTOCOutOfScale');
        } else {
          dojo.removeClass(this.domNode, 'agsjsTOCOutOfScale');
        }
        if (this.checkNode) {
          if (this.checkNode.set) {
            this.checkNode.set('disabled', outScale);
          } else {
            this.checkNode.disabled = outScale;
          }
        }
      }
      if (this._childTOCNodes.length > 0) {
        dojo.forEach(this._childTOCNodes, function(child){
          child._adjustToState();
        });
      }
    },
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
        } else if (this.rootLayer) {
          this.rootLayer.setVisibility(this.checkNode && this.checkNode.checked);
        }
        // automatically expand/collapse?
		if (this.rootLayerTOC.config.autoToggle !== false){
			this._toggleContainer(this.checkNode && this.checkNode.checked);
        }
		this.rootLayerTOC._adjustToState();
        
      } else if (t == this.iconNode) {
        this._toggleContainer();
      }
    },
	_setSubLayerVisibilitiesFromGroup: function(lay){
		if (lay._subLayerInfos && lay._subLayerInfos.length > 0 ){
			dojo.forEach(lay._subLayerInfos, function(info){
              info.visible = lay.visible;
			  if (info._subLayerInfos && info._subLayerInfos.length > 0){
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
        } else if (layerInfo.visible) {
          vis.push(layerInfo.id);
        }
      });
      if (vis.length === 0) {
        vis.push(-1);
      } else if (!this.rootLayer.visible) {
        this.rootLayer.show();
      }
      return vis;
    }
    , _findTOCNode: function(layerId){
      if (this.serviceLayer && this.serviceLayer.id == layerId) {
        return this;
      }
      if (this._childTOCNodes.length > 0) {
        var n = null;
        for (var i = 0, c = this._childTOCNodes.length; i < c; i++) {
           n = this._childTOCNodes[i]._findTOCNode(layerId);
           if (n) return n;
        }
      }
      return null;
	}
  });
  
 /// dojo.declare('agsjs.dijit._RootLayerTOC', [dijit._Widget], {
 var _RootLayerTOC = declare([_Widget], {
    _currentIndent: 0,
    rootLayer: null,
    tocWidget: null,
    /**
     *
     * @param {Object} params: noLegend: true|false, collapsed: true|false, slider: true|false
     * @param {Object} srcNodeRef
     */
    constructor: function(params, srcNodeRef){
      this.config = params.config || {};
      this.rootLayer = params.config.layer;
      this.tocWidget = params.tocWidget;
      
    },
    // extenstion point called by framework
    postCreate: function(){
      if ((this.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer) ||
      this.rootLayer instanceof (esri.layers.ArcGISTiledMapServiceLayer))) {
        // if it is '' then it means we do not title to be shown, i.e. not indent.
        if (this.config.title === undefined) {
          var start = this.rootLayer.url.toLowerCase().indexOf('/rest/services/');
          var end = this.rootLayer.url.toLowerCase().indexOf('/mapserver', start);
          this.config.title = this.rootLayer.url.substring(start + 15, end);
        }
        if (this._legendResponse) {
          this._createRootLayerTOC();
        } else {
          this._getLegendInfo();
        }
      } else {
        this._createRootLayerTOC();
      }
    },
    
    _getLegendInfo: function(){
    
      var url = '';
      if (this.rootLayer.version >= 10.01) {
        url = this.rootLayer.url + '/legend';
      } else {
        url = 'http://www.arcgis.com/sharing/tools/legend';
        var i = this.rootLayer.url.toLowerCase().indexOf('/rest/');
        var soap = this.rootLayer.url.substring(0, i) + this.rootLayer.url.substring(i + 5);
        url = url + '?soapUrl=' + escape(soap);
      }
      var handle = esri.request({
        url: url,
        content: {
          f: "json"
        },
        callbackParamName: 'callback',
        handleAs: 'json',
        load: dojo.hitch(this, this._processLegendInfo),
        error: dojo.hitch(this, this._processLegendError)
      });
      
    },
    _processLegendError: function(err){
      this._createRootLayerTOC();
    },
    _processLegendInfo: function(json){
      this._legendResponse = json;
      var layer = this.rootLayer;
      if (!layer._tocInfos) {
        // create a lookup map, key=layerId, value=LayerInfo
        // generally id = index, this is to assure we find the right layer by ID
        // note: not all layers have an entry in legend response.
        var layerLookup = {};
        dojo.forEach(layer.layerInfos, function(layerInfo){
          layerLookup['' + layerInfo.id] = layerInfo;
          // used for later reference.
          layerInfo.visible = layerInfo.defaultVisibility;
		  if (layer.visibleLayers && !layerInfo.subLayerIds) {
            if (dojo.indexOf(layer.visibleLayers, layerInfo.id) == -1) {
              layerInfo.visible = false;
            } else {
              layerInfo.visible = true;
            }
          }
        });
        // attached legend Info to layer info
        if (json.layers) {
          dojo.forEach(json.layers, function(legInfo){
            var layerInfo = layerLookup['' + legInfo.layerId];
            if (layerInfo && legInfo.legend) {
              layerInfo._legends = legInfo.legend;
            }
          });
        }
        // nest layer Infos
        dojo.forEach(layer.layerInfos, function(layerInfo){
          if (layerInfo.subLayerIds) {
            var subLayerInfos = [];
            dojo.forEach(layerInfo.subLayerIds, function(id, i){
              subLayerInfos[i] = layerLookup[id];
              subLayerInfos[i]._parentLayerInfo = layerInfo;
            });
            layerInfo._subLayerInfos = subLayerInfos;
          }
        });
		 //2012-07-21: if setVisibility is called before this widget is built, we want to use the actual visibility instead of the layerInfo.
        
        //finalize the tree structure in _tocInfos, skipping all sublayers because they were nested already.
        var tocInfos = [];
        dojo.forEach(layer.layerInfos, function(layerInfo){
          if (layerInfo.parentLayerId == -1) {
            tocInfos.push(layerInfo);
          }
        });
        layer._tocInfos = tocInfos;
      }
      this._createRootLayerTOC();
    },
    _createRootLayerTOC: function(){
    
      // sometimes IE may fail next step
      ///this._rootLayerNode = new agsjs.dijit._TOCNode({
	  this._rootLayerNode = new _TOCNode({
        rootLayerTOC: this,
        rootLayer: this.rootLayer
      });
      this._rootLayerNode.placeAt(this.domNode);
      this._visHandler = dojo.connect(this.rootLayer, "onVisibilityChange", this, "_adjustToState");
      // this will make sure all TOC linked to a Map synchronized.
      if (this.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer)) {
        this._visLayerHandler = dojo.connect(this.rootLayer, "setVisibleLayers", this, "_onSetVisibleLayers");
      }
      this._adjustToState();
      this._loaded = true;
      this.onLoad();
    },
	/**
	 * @event
	 */
    onLoad: function(){
    
    },
    _refreshLayer: function(){
      var rootLayer = this.rootLayer;
      var timeout = this.tocWidget.refreshDelay;
      if (this._refreshTimer) {
        window.clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
      this._refreshTimer = window.setTimeout(function(){
        rootLayer.setVisibleLayers(rootLayer.visibleLayers);
      }, timeout);
    },
    _onSetVisibleLayers: function(visLayers, doNotRefresh){
      // 2012-07-23:
      // set the actual individual layerInfo's visibility after service's setVisibility call.
      if (!doNotRefresh) {
        dojo.forEach(this.rootLayer.layerInfos, function(layerInfo){
          if (dojo.indexOf(visLayers, layerInfo.id) != -1) {
            layerInfo.visible = true;
          } else if (!layerInfo._subLayerInfos) {
            layerInfo.visible = false;
          }
        });
        this._adjustToState();
      }
    },
    _adjustToState: function(){
      this._rootLayerNode._adjustToState();
    },
    destroy: function(){
      dojo.disconnect(this._visHandler);
      if (this._visLayerHandler) 
        dojo.disconnect(this._visLayerHandler);
    }
  });
  
 // dojo.declare("agsjs.dijit.TOC", [dijit._Widget], {
  var TOC = declare("agsjs.dijit.TOC", [_Widget],{
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
    postCreate: function(){
      this._createTOC();
    },
    /** @event the widget DOM is loaded
     *
     */
    onLoad: function(){
    },
    _createTOC: function(){
      dojo.empty(this.domNode);
      this._rootLayerTOCs = [];
      for (var i = 0, c = this.layerInfos.length; i < c; i++) {
        // attach a title to rootLayer layer itself
        var info = this.layerInfos[i];
        ///var rootLayerTOC = new agsjs.dijit._RootLayerTOC({
		var rootLayerTOC = new _RootLayerTOC({
          config: info,
          tocWidget: this
        });
		this._rootLayerTOCs.push(rootLayerTOC);
        this._checkLoadHandler = dojo.connect(rootLayerTOC, 'onLoad', this, '_checkLoad');
        rootLayerTOC.placeAt(this.domNode);
        this._checkLoad();
      }
      if (!this._zoomHandler) {
        this._zoomHandler = dojo.connect(this.map, "onZoomEnd", this, "_adjustToState");
      }
        if (!this._layersReordered) {
            this._layersReordered = dojo.connect(this.map, 'onLayersReordered', this, function(layerIds) {
                console.log('layers reordered event');
                //console.dir(layerIds); WTF?
                if (this._syncTOC()) {
                    this.destroy();
                    this.refresh();
                }
            });
        }
        if (!this._layerAdd) {
            this._layerAdd = dojo.connect(this.map, 'onLayerAddResult', this, function(layer) {
                console.log('add layer event');
                if (this._syncTOC()) {
                    this.destroy();
                    this.refresh();
                }
            });
        }
        /*if (!this._layerRemove) {
            this._layerRemove = dojo.connect(this.map, 'onLayerRemove', this, function(layer) {
                console.log('remome layer event');
                for (var i = 0; i < this.layerInfos.length; i++) {
                    if (this.layerInfos[i].layer.id == layer.id) {
                        this.layerInfos.splice(i, 1);
                        this.destroy();
                        this.refresh();
                        break;
                    }
                };
            });
        }*/
    },
    _checkLoad: function(){
      var loaded = true;
      dojo.every(this._rootLayerTOCs, function(widget){
        if (!widget._loaded) {
          loaded = false;
          return false;
        }
        return true;
      });
      if (loaded) {
        this.onLoad();
      }
    },
    _adjustToState: function(){
      dojo.forEach(this._rootLayerTOCs, function(widget){
        widget._adjustToState();
      });
    },
    /* 
        Synchronize TOC content with layers in map
    */
    _syncTOC: function() {
        //console.log('sync TOC');
        
        //console.log(map.layerIds);
        //console.dir(this.layerInfos);

        var layerInfosNew = [];
        for (var i = 0; i < map.layerIds.length; i++) {
            for (var j = 0; j < this.layerInfos.length; j++) {
                if (this.layerInfos[j].layer.id == map.layerIds[i]) {
                    layerInfosNew.push(this.layerInfos[j]);
                    break;
                }
            }
            if (this.layerInfos.length == 0 || this.layerInfos.length == j) {
                var layer = map.getLayer(map.layerIds[i]);
                var layerTitle = 'TITLE'
                if (layer.url) {
                    layerTitle = layer.url.split('/');
                    layerTitle = layerTitle[layerTitle.length - 2];
                }
                if (layer.arcgisProps) {
                    if (layer.arcgisProps.title) layerTitle = layer.arcgisProps.title;
                }
                if (!layer._basemapGalleryLayerType)
                    layerInfosNew.push({layer: layer, title: layerTitle, collapsed: true, autoToggle: false});
            }
        }
        layerInfosNew.reverse();

        //console.dir(layerInfosNew);
        
        if (this.layerInfos.length != layerInfosNew.length) {
            this.layerInfos = layerInfosNew;
            return true;
        }

        for (var i = 0; i < this.layerInfos.length; i++) {
            if (this.layerInfos[i] != layerInfosNew[i]) {
                this.layerInfos = layerInfosNew;
                return true;
            }
        }
        
        return false;
    },
    /**
     * Refresh the TOC to reflect
     */
    refresh: function(){
        console.log('refresh TOC');
      this._createTOC();
    },
    destroy: function(){
      dojo.disconnect(this._zoomHandler);
      this._zoomHandler = null;
      dojo.disconnect(this._checkLoadHandler);
      this._checkLoadHandler = null;

        dojo.disconnect(this._layerAdd);
        this._layerAdd = null;

        dojo.disconnect(this._layerRemove);
        this._layerRemove = null;

        dojo.disconnect(this._layersReordered);
        this._layersReordered = null;
    },
	/**
	 * Find the TOC Node based on root layer and optional serviceLayer ID. 
	 * @param {Object} layer root Layer of a map
	 * @param {Object} serviceLayerId id of a ArcGIS Map Service Layer
	 * @return {TOCNode} TOC node, it has public methods: collapse, expand, show, hide
	 */
	findTOCNode: function(layer, serviceLayerId){
		var w;
		dojo.every(this._rootLayerTOCs, function(widget){
			if(widget.rootLayer == layer){
				w = widget;
				return false;
			}
			return true;
		});
		if (serviceLayerId !== null && serviceLayerId !== undefined && w.rootLayer instanceof (esri.layers.ArcGISDynamicMapServiceLayer)) {
        	return w._rootLayerNode._findTOCNode(serviceLayerId);
		} else if (w){
			return w._rootLayerNode;
		}
		return null;
	}
  });
  return TOC;

});