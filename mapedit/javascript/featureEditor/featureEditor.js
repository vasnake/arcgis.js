// https://github.com/Esri/feature-service-editor-js
/**
 * Library for rapid, table-based editing of a point-based ArcGIS
 * FeatureServices. With this library you can search, modify, add or delete
 * points. This functionality can be wired into a map.
 *
 * @author Andy Gup
 * @version 0.4.1
 * @type {Object} featureEditor Class.
 */
var featureEditor = featureEditor || {};
featureEditor.utils = {};
featureEditor.ui = {};
featureEditor.grid = null;
featureEditor.addGrid = null;
featureEditor.columnNamesArr = [];
featureEditor.pageInfo = null;
featureEditor.store = null;
featureEditor.addStore = null;
featureEditor.currentRecord = null;
featureEditor.currentAddRecord = null;
featureEditor.currentAddRow = null;
featureEditor.featureLayer = null;
featureEditor.masterRecordArr = [];
featureEditor.restEndpoint = null;
featureEditor.dgridRowClickListener = null;
featureEditor.dgridCellClickListener = null;
featureEditor.dgridAddCellClickListener = null;
featureEditor.outFields = null;
featureEditor.loadingIcon = null;
featureEditor.spatialReference = null;
featureEditor.xField = null; // internal - field string name containing x
                                // geometry value
featureEditor.yField = null; // internal - field string name containing y
                                // geometry value;

/**
 * An array of the editable fields within the featureLayer. By default, fields
 * with the property editable = false are automatically excluded.
 *
 * @type {Array}
 */
featureEditor.featureEditDetails = [];

/**
 * Local ENUMs (Constants)
 *
 * @type {Object}
 * @returns {*}
 */
featureEditor.localEnum = (function() {
    var values = {
        RECORDS_PER_PAGE : 1000,
        HTTP_REQUEST_TIMEOUT : 30000,
        PREVENT_OBJECTID_EDIT : true,
        TYPE : "type" /* featureService field type property */,
        OUTFIELDS : "*" /* outField property for FeatureLayer and Query */
    };

    return values;
});

require(
        [ 'dojo/_base/declare', "esri/layers/FeatureLayer", "esri/tasks/query",
                "dijit/form/Button", "dojo/number", "dgrid/OnDemandGrid",
                "dgrid/Selection", "dgrid/extensions/ColumnHider",
                "dgrid/extensions/ColumnResizer", "dgrid/CellSelection",
                "dgrid/util/mouse", "dgrid/Keyboard", "dgrid/editor",
                "dojo/store/Memory", "dojo/on", "dojo/when", "dojo/request",
                "dojo/query", "dojo/Deferred", "dojox/widget/Standby",
                "dojo/domReady!" ],
        function(declare, FeatureLayer, Query, Button, number, OnDemandGrid,
                ColumnHider, ColumnResizer, Selection, CellSelection,
                mouseUtil, Keyboard, editor, Memory, on, when, request, query,
                Deferred, Standby) {

            /**
             * Begin by initializing the library here. <b>IMPORTANT:</b> This
             * app uses a stand-alone FeatureService that is not associated with
             * a map. You can modify this app to use an existing Feature Service
             * within your mapping application.
             *
             * @param useQueryString
             *            use any user input into the query string text box
             *            otherwise ignore
             */
            featureEditor.init = function(/* boolean */useQueryString) {
                vslib.log("featureEditor.init. useQueryString: "
                        + useQueryString);

                dojo.byId("grid").style.visibility = "visible";

                featureEditor.loadingIcon = featureEditor.utils
                        ._createStandbyIcon("grid");
                featureEditor.loadingIcon.show();

                // Attempt a soft reset of grid data without having to recreate
                // from scratch.
                if (featureEditor.grid != null) {

                    featureEditor.grid.store.setData({});
                    featureEditor.grid.refresh();
                    featureEditor.pageInfo = null;
                    featureEditor.grid = null;
                    featureEditor.columnNamesArr = [];
                    featureEditor.pageInfo = null;
                    featureEditor.store = null;
                    featureEditor.addStore = null;
                    featureEditor.currentRecord = null;
                    featureEditor.currentAddRow = null;
                    featureEditor.featureLayer = null;
                    featureEditor.masterRecordArr = [];
                    featureEditor.restEndpoint = null;
                    featureEditor.dgridAddCellClickListener = null;
                    featureEditor.spatialReference = null;
                    featureEditor.xField = null;
                    featureEditor.yField = null;

                }

                if (featureEditor.dgridRowClickListener != null)
                    featureEditor.dgridRowClickListener.remove();
                if (featureEditor.dgridCellClickListener != null)
                    featureEditor.dgridCellClickListener.remove();

                // If the add new feature grid is visible then shut it down
                if (featureEditor.addGrid != null) {
                    featureEditor.addGrid.store.setData({});
                    featureEditor.addGrid.refresh();
                    featureEditor.addGrid = null;
                    featureEditor.ui.handleAddRecord(true);
                    featureEditor.ui.handleAddRemoveEditGrid(false);
                }

                var queryString = document.getElementById("query-string").value;
                var url = document.getElementById("fsEndpoint").value;
                var isURLvalid = featureEditor.utils.validateURL(url);

                // Currently the outfield property is locked to return all
                // fields.
                // So the capability to modify it has been commented out.
                // featureEditor.outFields =
                // dojo.byId("outfields-string").value;
                featureEditor.outFields = featureEditor.localEnum().OUTFIELDS;

                // Check for blank queryString
                if (featureEditor.outFields == "")
                    featureEditor.outFields = "*";
                if (queryString == "" || useQueryString == false)
                    queryString = "1=1";

                if (typeof (dojo) !== "undefined" && isURLvalid) {
                    featureEditor.restEndpoint = url;
                    featureEditor.featureLayer = new FeatureLayer(document
                            .getElementById("fsEndpoint").value, {
                        outFields : [ featureEditor.outFields ]
                    });

                    var query = new Query();
                    query.where = queryString;
                    // query.timeExtent = new esri.TimeExtent(new
                    // Date("01/01/2007 UTC"));
//                    var deferred = new Deferred();
                    deferred = featureEditor.featureLayer.queryIds(
                                    query,
                                    function(/* array */objectIds) {
                                        if (objectIds.length > 0) {
                                            featureEditor._fetchRecords(objectIds);
                                        } else {
                                            alert("No results found.");
                                            featureEditor.loadingIcon.hide();
                                        }
                                    },
                                    function(err) {
                                        featureEditor.loadingIcon.hide();
                                        console.log("queryIds: Error: "
                                                + err.code + ", "
                                                + err.details[0]);
                                        alert("No results found. "
                                                + err.details[0]);
                                    })
                            .then(dojo.hitch(window,
                                function() {
                                    // Create a simple array
                                    // of field names that
                                    // are editable
                                    for ( var item in featureEditor.featureLayer.fields) {
                                        try {
                                            var editable = featureEditor.featureLayer.fields[parseFloat(item)].editable;
                                            var name = featureEditor.featureLayer.fields[parseFloat(item)].name;
                                            var lcName = name.toLowerCase();
// Get the names  of the fields  corresponding  to x and y.  This could be  problematic  if someone  uses x or y  in the first
// part of the  field name
                                            if (lcName.indexOf("x") != -1
                                                && lcName.substring(0, 1) == "x")
                                                featureEditor.xField = name;
                                            if (lcName.indexOf("y") != -1
                                                    && lcName.substring(0, 1) == "y")
                                                featureEditor.yField = name;

                                            if (editable == true) {
                                                featureEditor.featureEditDetails.push(name);
                                            }
                                        } catch (err) {
                                            console.log("init: " + err.message);
                                        }
                                    }
                                }));

                } else {
                    alert("Feature Service URL is not valid");
                }
            }; // init function


            /**
             * Determines whether or not to fetch records obtained via a
             * queryIds request.
             *
             * @param objectIds
             * @private
             */
            featureEditor._fetchRecords = function(objectIds) {
                if (objectIds.length > 0) {
                    featureEditor._updatePageInformation(objectIds);
                    featureEditor.queryRecordsByPage(1);
                } else {
                    if (featureEditor.grid != null) {
                        featureEditor.grid.setStore(null);
                        featureEditor.grid.showMessage("No matching records");
                    }

                    featureEditor.loadingIcon.hide();
                    alert("No record found.");
                }
            }; // _fetchRecords


            featureEditor._updatePageInformation = function(objectIds, page) {

                featureEditor.pageInfo = {
                    objectIds : objectIds,
                    totalRecords : objectIds.length,
                    totalPages : Math.ceil(objectIds.length / featureEditor.localEnum().RECORDS_PER_PAGE),
                    currentPage : page || 0,
                    recordsPerPage : featureEditor.localEnum().RECORDS_PER_PAGE
                };

                dojo.byId("pageInfo").innerHTML = featureEditor.pageInfo.currentPage
                        + "/" + featureEditor.pageInfo.totalPages;
                dojo.byId("recordsInfo").innerHTML = featureEditor.pageInfo.totalRecords;

                if (featureEditor.pageInfo.currentPage > featureEditor.pageInfo.totalPages) {
                    featureEditor.queryRecordsByPage(pageInfo.currentPage - 1);
                }
            }; // _updatePageInformation


            /**
             * Query the remote feature service page page number
             *
             * @param pageNumber
             */
            featureEditor.queryRecordsByPage = function(/* number */ pageNumber) {
                // check if the page number is valid
                if (pageNumber < 1 || pageNumber > featureEditor.pageInfo.totalPages) {
                    console.log("queryRecordsbyPage: page number invalid.");
                    return;
                }

                featureEditor.loadingIcon.show();

                var begin = featureEditor.pageInfo.recordsPerPage * (pageNumber - 1);
                var end = begin + featureEditor.pageInfo.recordsPerPage;

                // create the query
                var query = new esri.tasks.Query();
                query.objectIds = featureEditor.pageInfo.objectIds.slice(begin, end);
                query.outFields = featureEditor.outFields;
                // alert();
                // setTimeout(function () { alert(); }, 3000);
                // for (var i = 0; i < 2000000000; i++) { i++; }
                // Query for the records with the given object IDs and populate
                // the grid
                featureEditor.featureLayer.queryFeatures(
                    query,
                    function(featureSet) {
                        // alert();
                        // Verify that feature service only contains
                        // point data
                        if (featureSet != null
                            && featureSet.features.length > 0
                            && featureSet.features[0].geometry.type != "point")
                        {
//                            featureEditor.loadingIcon.hide();
//                            alert("Can only load point based feature services, sorry.");
                            vslib.log("featureEditor.queryRecordsByPage. Can only load point based feature services, sorry.");
                            vslib.dir(featureSet.features[0]);
//                            return;
                        }

                        featureEditor.spatialReference = featureSet.features[0].geometry.spatialReference;

                        var i = 0;
                        var arr = [];
                        var columnArr = [];
                        var length = featureEditor.featureEditDetails.length;

                        for ( var key in featureSet.features[0].attributes) {
                            // console.log(key);
                            arr[i] = key;

                            // See if there are any editable
                            // features.
                            var editTest = -1;
                            if (length > 0) {
                                editTest = featureEditor.featureEditDetails
                                        .indexOf(key);
                            }

                            // Item is editable if != -1
                            if (editTest != -1) {
                                columnArr[i] = editor({
				    label: featureSet.fields[i].alias, //key.toString(),
                                    field : key.toString(),
                                    hidden : false,
                                    editor : "text",
                                    // editOn:"dblclick"
                                    editOn : "click"
                                });
                            } else {
                                columnArr[i] = {
				    label: featureSet.fields[i].alias, //key.toString(),
                                    field : key.toString(),
                                    hidden : false
                                };
                            }

                            i++;
                        } // for each attribute

                        /*
                         * //Add the Save button columnArr[i] =
                         * {save:"Save",renderCell:
                         * function(object,data,cell){
                         *
                         * var btn = Button({ showLabel : false,
                         * iconClass : "saveIcon16", disabled :
                         * true, style: "visibility:visible",
                         * onClick: dojo.hitch(this,function(event){
                         * if(this.grid.id == "grid"){
                         * featureEditor.updateRecord(); } else{
                         * //alert('hi');
                         * featureEditor.addNewRecord(); } var b =
                         * event.currentTarget.children[0].id; var c =
                         * dijit.byId(b); c.set('disabled',true); })
                         * },cell.appendChild(document.createElement("div")));
                         * }};
                         *
                         * //Add the Undo button columnArr[i+1] =
                         * {undo:"Undo",renderCell:
                         * function(object,data,cell){
                         *
                         * var undoBtn = Button({ showLabel : false,
                         * iconClass : "undoIcon16", label : "Undo",
                         * disabled : true, style:
                         * "visibility:visible", onClick:
                         * dojo.hitch(this,function(event){
                         * if(this.grid.id == "grid"){
                         * featureEditor.utils.revertLocalRecord(); }
                         * else{
                         * featureEditor.utils.revertLocalAddRecord(); }
                         * var b =
                         * event.currentTarget.children[0].id; var c =
                         * dijit.byId(b); c.set('disabled',true); })
                         * },cell.appendChild(document.createElement("div")));
                         * }};
                         *
                         *
                         * //Add the Undo button columnArr[i+2] =
                         * {delete:"Delete",renderCell:
                         * function(object,data,cell){
                         *
                         * var deleteBtn = Button({ showLabel :
                         * false, iconClass : "deleteIcon16", label :
                         * "Delete", disabled : true, style:
                         * "visibility:visible", onClick:
                         * dojo.hitch(this,function(event){
                         * if(this.grid.id == "grid"){ var test =
                         * confirm("Really delete?"); if(test ==
                         * true){
                         * featureEditor.deleteFeature(featureEditor.currentRecord,null,true); }
                         * else{
                         * featureEditor.utils.revertLocalRecord(); } }
                         * else{
                         * //featureEditor.utils.revertLocalAddRecord(); }
                         * var b =
                         * event.currentTarget.children[0].id; var c =
                         * dijit.byId(b); c.set('disabled',true); })
                         * },cell.appendChild(document.createElement("div")));
                         * }};
                         */
                        featureEditor.columnNamesArr = columnArr;

                        if (featureEditor.grid == null) {
                            featureEditor.utils.createGrid(columnArr);
                            featureEditor.utils.updateGrid(featureSet, pageNumber, arr);
                        } else {
                            featureEditor.utils.updateGrid(
                                    featureSet, pageNumber, arr);
                        }
                    });
            }; // queryRecordsByPage


            /**
             * Adds a new record to the remote ArcGIS database. IMPORTANT: this
             * method currently only checks to see if there is a field that
             * contains a lower-case 'x' and 'y' which indicates a point-based
             * feature service. This could be problematic for some feature
             * services that have other field names containing an x and y.
             *
             * If you are reading this and having issues, please submit
             * suggestions in the Issues section of the repository!
             *
             * If you are wondering how to get access to the type definition for
             * each field see the feature services REST endpoint under the
             * "fields" section.
             */
            featureEditor.addNewRecord = function() {

                //var nameArr = [];
                var dirty = featureEditor.addGrid.dirty;
                var id = Object.keys(dirty)[0];
                console.log(dirty[id]);

                // if id is undefined it means dirty changes have been saved
                // when id='TBD' it means user has modified the new entry
                if (typeof (id) != "undefined" && id == "TBD") {
                    // get object property names
                    for ( var item in dirty[id]) {
                        // nameArr.push(item);
                        featureEditor.currentAddRecord[item] = dirty[id][item];
                    }

                    // featureEditor.currentAddRecord[nameArr[0]] =
                    // dirty[id][nameArr[0]];
                    // console.log(nameArr + ", " + dirty[id][nameArr[0]]);

                    try {

                        var xVal = featureEditor.currentAddRecord[featureEditor.xField];
                        var yVal = featureEditor.currentAddRecord[featureEditor.yField];

                        // Validate that location fields contain numerical
                        // values
                        if (isNaN(xVal) == true || isNaN(yVal) == true) {
                            alert("Unable to update, location values aren't valid numbers");
                            return;
                        }

                        var sms = new esri.symbol.SimpleMarkerSymbol().setStyle(
                                esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE).setColor(
                                new dojo.Color([ 255, 0, 0, 0.5 ]));

                        var pt = new esri.geometry.Point(xVal, yVal, featureEditor.spatialReference);

                        var graphic = new esri.Graphic(pt, sms,
                                featureEditor.currentAddRecord);

                        featureEditor.loadingIcon.show();
                        featureEditor.insertNewFeature([ graphic ], null, true);

                    } catch (err) {
                        featureEditor.loadingIcon.hide();
                        alert("Unable to complete add new record. " + err.message);
                    }
                } else {
                    featureEditor.loadingIcon.hide();
                    alert("Unable to complete add new record. No valid values.");
                }
            }; // addNewRecord


            /**
             * Updates a single existing record in the feature service. NOTE:
             * Feature must contain a valid OBJECTID field!
             */
            featureEditor.updateRecord = function() {
                var log = function(str) { vslib.log("featureEditor.updateRecord. " + str + ""); };

             // because OBJECTID represent as string and applyEdits is missing
                var oid = featureEditor.currentRecord.OBJECTID = parseInt(
                    featureEditor.currentRecord.OBJECTID, 10);
                log("objectid: " + oid + "; featureEditor.currentRecord: " + vslib.toJson(featureEditor.currentRecord));

                var dirty = vslib.toJson(featureEditor.grid.dirty);
                log("dirty: " + dirty);
                dirty = vslib.fromJson(dirty);

                var hasData = false;
                // find and set current row
                for(var property in dirty) {
                    log("record key: " + property);
                    if (parseInt(property) == oid) {
                        log("found current record...");
                        // get object property names
                        for(var item in dirty[property]) {
                            log("field name: " + item);
                            if (featureEditor.currentRecord.hasOwnProperty(item)) {
                                hasData = true;
                                featureEditor.currentRecord[item] = dirty[property][item];
                                log("set new value: " + dirty[property][item]);
                            } else {
                                log("feature didn't have such attrib");
                                if(vslib.strStartsWith(item, "_")) {
                                    log("skip protected '_*'");
                                } else {
                                    log("add new attrib");
                                    hasData = true;
                                    featureEditor.currentRecord[item] = dirty[property][item];
                                }
                            }
                        }
                        break;
                    }
                } // for each property in dirty

                if (!hasData) {
                    log("dirty is empty, nothing to save");
                    alert("Unable to update since nothing changed");
                    featureEditor.utils.revertLocalRecord();
                    return;
                } else {
                    log("dirty has data, try to save...");
                }

                try {
                    var fea = null;
                    log("featureEditor.masterRecordArr: "); vslib.dir(featureEditor.masterRecordArr);

                    if (featureEditor.masterRecordArr.length == 1) {
                        fea = featureEditor.masterRecordArr[0];
                    } else if (featureEditor.masterRecordArr.length > 1) {
                        fea = featureEditor.masterRecordArr[oid];
                    } else {
                        alert("Unable to update feature. Row is empty?");
                        return;
                    }

                    log("masterRecord data: "); vslib.dir(fea);
                    var graphic = new esri.Graphic(
                        fea.geometry,
                        fea.symbol,
                        featureEditor.currentRecord,
                        fea.infoTemplate
                    );
                    log("graphic for save: "); vslib.dir(graphic);

                    featureEditor.loadingIcon.show();

                    featureEditor.featureLayer.applyEdits(
                        null,
                        [ graphic ],
                        null,
                        function(addResult, updateResult, deleteResult) {
                            log("updateRecord OK: " + updateResult[0].objectId + ", Success: " + updateResult[0].success);
                            featureEditor.grid.refresh();
                            featureEditor.loadingIcon.hide();
                        },
                        function(error) {
                            var message = "";
                            if (error.code) message = error.code;
                            if (error.description) message += error.description;
                            log("updateRecord failed: " + error.message + ", " + message);
                            featureEditor.grid.refresh();
                            featureEditor.loadingIcon.hide();
                            alert("Unable to update. " + error.message + ", " + message);
                        }
                    ); // featureEditor.featureLayer.applyEdits

                } catch (err) {
                    vslib.log("Unable to complete update. " + err.message, true);
                    vslib.log("updateRecord. err stack: " + err.stack);
                    vslib.dir(err);
                }
            }; // updateRecord


            /**
             * Used to insert a new record/feature into the remote feature
             * service.
             *
             * @param graphic
             *            [Graphic]
             * @param token
             *            String
             * @param confirm
             *            use an alert to confirm success.
             */
            featureEditor.insertNewFeature = function(
                    /* Array */ graphic,
                    /* String */ token,
                    /* boolean */ confirm) {

                featureEditor.featureLayer
                        .applyEdits(
                                graphic,
                                null,
                                null,
                                function(response) {
                                    // var t = JSON.parse(response);
                                    if (response[0].success == true) {

                                        featureEditor.addGrid.store.setData({});
                                        featureEditor.addGrid.refresh();
                                        featureEditor.ui.handleAddRecord(true);
                                        featureEditor.ui
                                                .handleAddRemoveEditGrid(false);

                                        featureEditor
                                                .queryRecordsByPage(featureEditor.pageInfo.currentPage);
                                        // featureEditor.grid.save();
                                        console
                                                .log("insertNewFeature successful: "
                                                        + response);
                                        featureEditor.loadingIcon.hide();

                                        if (confirm)
                                            alert("Feature #"
                                                    + response[0].objectId
                                                    + " was successfully added.");
                                    } else {
                                        console
                                                .log("insertNewFeature: There was a problem with writing the record to database");
                                        featureEditor.grid.refresh();
                                        featureEditor.loadingIcon.hide();
                                        alert("There was a problem and feature was not added.");
                                    }
                                },
                                function(error) {
                                    // NOTE: There is a bug in which the correct
                                    // error message is not displayed
                                    // Until it's fixed view the response
                                    // payload in the Network tab of the
                                    // developer tools.
                                    var message = "";
                                    if (error.code)
                                        message = error.code;
                                    if (error.description)
                                        message += error.description;
                                    console.log("insertNewFeature: "
                                            + error.message + ", " + message);

                                    featureEditor.grid.refresh();
                                    featureEditor.loadingIcon.hide();

                                    alert("There was a problem adding a new feature: "
                                            + error.message + ", " + message);
                                });
            }; // insertNewFeature


            /**
             * Used to DELETE record/feature from a remote feature service.
             *
             * @param data
             *            featureEditor.currentRecord
             * @param token
             *            String
             * @param confirm
             *            use an alert to confirm if delete was successful.
             */
            featureEditor.deleteFeature = function(
                /* Object */ data,
                /* String */ token,
                /* boolean */ confirm) {

                var graphic = null;
//                var confirm = confirm;

                try {

                    if (featureEditor.masterRecordArr.length >= 1) {
                        graphic = new esri.Graphic(null, null, featureEditor.currentRecord, null);
                    } else {
                        alert("Unable to delete feature. Row is empty?");
                        return false;
                    }

                } catch (err) {
                    console.log("deleteFeature: " + err.message);
                    alert("Unable to delete feature - " + err.message);
                    return false;
                }

                featureEditor.featureLayer.applyEdits(
                    null,
                    null,
                    [ graphic ],
                    function(adds, updates, deletes) {
                        if (deletes[0].success == true) {
                            // featureEditor.queryRecordsByPage(1);
                            // featureEditor.grid.save();
                            console.log("deleteFeatures successful on ObjectID: "
                                + deletes[0].objectId
                                + ", success: "
                                + deletes[0].success);
                            featureEditor.loadingIcon.hide();

                            featureEditor.init(false);

                            if (confirm)
                                alert("deleteFeatures successful on ObjectID: "
                                    + deletes[0].objectId);
                        } else {
                            console.log("deleteFeature: There was a problem with writing the record to database");
                            featureEditor.grid.refresh();
                        }

                        featureEditor.loadingIcon.hide();
                    },
                    function(error) {
                        // NOTE: There is a bug in which the correct
                        // error message is not displayed
                        // Until it's fixed view the response
                        // payload in the Network tab of the
                        // developer tools.
                        var message = "";
                        if (error.code)
                            message = error.code;
                        if (error.description)
                            message += error.description;
                        console.log("deleteFeature: "
                                + error.message + ", " + message);

                        featureEditor.grid.refresh();
                        featureEditor.loadingIcon.hide();

                        alert("There was a problem deleting: "
                            + error.message + ", " + message);
                    });
            }; // deleteFeature


            /**
             * DEPRECATED as of v0.4 Updates an existing the record/feature in
             * the remote feature service.
             *
             * @param data
             *            Object
             * @param token
             *            String
             */
            featureEditor.applyEdits = function(
                /* Object */ data,
                /* String */ token) {
                if (token == null)
                    token = "";

                request.post(featureEditor.restEndpoint + "/updateFeatures",
                    {
                        sync : false,
                        timeout : featureEditor.localEnum().HTTP_REQUEST_TIMEOUT,
                        handlAs : "json",
                        data : {
                            features : data,
                            f : "json",
                            rollbackOnFailure : "false",
                            token : token
                        },
                        headers : {
                            "X-Requested-With" : null
                        }
                    }
                ).then(
                    function(response) {
                        var t = JSON.parse(response);
                        if (t.updateResults[0].success == true) {
                            featureEditor.queryRecordsByPage(featureEditor.pageInfo.currentPage);
                            featureEditor.grid.save();
                            console.log("applyEdits successful: " + response);
                            featureEditor.loadingIcon.hide();
                        } else {
                            console.log("applyEdits: There was a problem with updating the record");
                            alert("Unable to update record: Error "
                                + t.updateResults[0].error.code
                                + ", "
                                + t.updateResults[0].error.description);
                            featureEditor.grid.refresh();
                            featureEditor.loadingIcon.hide();
                        }
                    },
                    function(error) {
                        var message = "";
                        if (error.code)
                            message = error.code;
                        if (error.description)
                            message += error.description;
                        console.log("updateRecord: "
                                + error.message + ", " + message);
                        alert("There was a problem applying edits."
                                + error.message + ", " + message);
                        featureEditor.grid.refresh();
                        featureEditor.loadingIcon.hide();
                    }
                );
            }; // applyEdits


            /**
             * Validates a url
             *
             * @param url
             * @returns boolean
             */
            featureEditor.utils.validateURL = function(/* String */url) {
                return /^(ftp|http|https):\/\/[^ "]+$/.test(url);
            };


            /**
             * Simply adds a new row to the currently visible grid. Does not
             * automatically push changes to the remote store. Disables the
             * addNewRecord button on the new row has been through a
             * double-click > save cycle.
             */
            featureEditor.utils.addNewLocalRecord = function() {

                if (featureEditor.grid == null) {
                    console.log("addNewLocalRecord: unable to create because primary grid is null.");
                    return;
                }

                featureEditor.ui.handleAddRemoveEditGrid(true);
                featureEditor.utils.createAddGrid(featureEditor.columnNamesArr);

                var entryObject = {};

                dojo.forEach(featureEditor.featureLayer.fields, function(entry, i) {
                    if (i != 0) {
                        entryObject[entry.name.toString()] = "edit me";
                    } else {
                        entryObject[entry.name.toString()] = "TBD";
                    }
                });

                try {

                    featureEditor.addStore.put(entryObject);
                    featureEditor.addGrid.refresh();
                    // featureEditor.addGrid.row("TBD").element.scrollIntoView();

                    // featureEditor.grid.store.put(entryObject);
                    // featureEditor.grid.refresh();
                    // //featureEditor.grid.row("TBD").element.scrollIntoView();
                    //
                    // var row = featureEditor.grid.row("TBD");
                    // dojo.style(row.element,"backgroundColor","#FFFF00");
                    // dojo.style(row.element.id,"color","#FF0000 !important");
                    // row.element.style.color = "#FF000";

                    var row2 = featureEditor.addGrid.row("TBD");
                    dojo.style(row2.element, "backgroundColor", "#FFFF00");
                    // dojo.style(row2.element.id,"color","#FF0000 !important");
                    row2.element.style.color = "#FF000";

                    // var rowHeight =
                    // featureEditor.addGrid.contentNode.children[1].clientHeight;
                    // var headerHeight =
                    // featureEditor.addGrid.headerNode.clientHeight;
                    // dojo.style("add-grid","height",rowHeight + headerHeight +
                    // " !important");

                    // if(typeof(row.element.children) != "undefined"){
                    // dojo.forEach(row.element.children[0].children,function(entry,
                    // i){
                    // entry.style.color = "#FF0000";
                    // })
                    // }

                    if (typeof (row2.element.children) != "undefined") {
                        dojo.forEach(row2.element.children[0].children,
                            function(entry, i) {
                                var t = entry.className;
                                if (t.indexOf("dijitButton") == -1) {
                                    entry.style.color = "#FF0000";
                                }
                            }
                        );
                    }

                    featureEditor.ui.handleAddRecord(false);
                } catch (err) {
                    console.log("addNewLocalRecord: " + err.message);
                    featureEditor.addGrid.refresh();
                    featureEditor.ui.handleAddRecord(false);
                }

            }; // addNewLocalRecord


            /**
             * Reverts a single local record update in the dgrid only. Does not
             * push the change to the server.
             */
            featureEditor.utils.revertLocalRecord = function() {
                var dirty = featureEditor.grid.dirty;
                var id = Object.keys(dirty)[0];
                delete dirty[id];
                featureEditor.grid.refresh();
            }; // revertLocalRecord


            /**
             * Reverts a single local record update in the temporary addGrid
             * only. Does not push the change to the server.
             */
            featureEditor.utils.revertLocalAddRecord = function() {
                var dirty = featureEditor.addGrid.dirty;
                var id = Object.keys(dirty)[0];
                delete dirty[id];
                featureEditor.addGrid.refresh();
            }; // revertLocalAddRecord


            /**
             * Rolls back a newly enter row by deleting it from the grid.store.
             */
            featureEditor.utils.removeNewLocalRecord = function() {

                // when(featureEditor.addGrid.store.query(function(){
                // return true;
                // }),function(results){
                // dojo.forEach(results, function (entry, i){
                // //console.log(entry);
                // for (var value in entry){
                // if(entry[value] === "TBD"){
                // featureEditor.addGrid.store.remove(entry[value]);
                // featureEditor.addGrid.refresh();
                // featureEditor.ui.handleAddRecord(true);
                // return;
                // }
                // }
                // });
                //
                // featureEditor.ui.handleAddRemoveEditGrid(false);
                // })

                featureEditor.addGrid.store.setData({});
                featureEditor.addGrid.refresh();
                featureEditor.addGrid = null;
                featureEditor.ui.handleAddRecord(true);
                featureEditor.ui.handleAddRemoveEditGrid(false);

                featureEditor.init(true);
            }; // removeNewLocalRecord


            /**
             * An optional grid legend that displays fields and a toggle for
             * show/remove if there are many columns and you only want to work
             * with a few.
             *
             * @param grid
             */
            featureEditor.utils.createGridLegend = function(/* Grid */grid) {
                var htmlString = "";
                dojo.forEach(grid.columns,
                    function(entry, i) {
                        if (typeof (entry.label) !== "undefined") {
                            htmlString += "<input type='checkbox' onclick='featureEditor.utils.addRemoveColumns("
                                + i
                                + ")' id='checkbox"
                                + i
                                + "' checked='yes' value='"
                                + i
                                + "'>" + entry.label + "<br/>";
                        };
                    }
                );

                dojo.byId("grid-legend").innerHTML = htmlString;
            }; // createGridLegend


            /**
             * Create the data grid
             *
             * @param object
             *            ArcGIS Feature
             */
            featureEditor.utils.createGrid = function(/* Object */object) {
                var complete = true;

                try {
                    var dataIDProperty = object[0].field; // DEFAULT...Could be problematic depending on browser!
                    featureEditor.store = new Memory({
                        data : [],
                        idProperty : dataIDProperty
                    });

                    var CustomGrid = declare([ OnDemandGrid, Selection,
                        CellSelection, Keyboard ]);

                    // Dojo's dGrid
                    featureEditor.grid = new CustomGrid({
                        store : featureEditor.store,
                        columns : object,
                        selectionMode : 'single' /* , noDataMessage:'Nothing found.' */
                    }, 'grid');

                    // featureEditor.utils._setListeners();
                } catch (err) {
                    complete = false;
                    console.log("createGrid: " + err.message);
                }

                return complete;
            }; // createGrid


            /**
             * A temporary grid that is created to specifically handle new
             * entries.
             *
             * @param object
             *            An object containing the columns for the custom
             *            OnDemandGrid
             */
            featureEditor.utils.createAddGrid = function(/* Object */object) {
                try {
                    var dataIDProperty = object[0].field; // DEFAULT...Could be problematic depending on browser!
                    featureEditor.addStore = new Memory({
                        data : [],
                        idProperty : dataIDProperty
                    });

                    var CustomGrid = declare([ OnDemandGrid, Selection,
                            CellSelection, Keyboard ]);

                    // Dojo's dGrid
                    featureEditor.addGrid = new CustomGrid({
                        store : featureEditor.addStore,
                        columns : object,
                        selectionMode : 'single'/*, noDataMessage:'Nothing found.' */
                    }, 'add-grid');

                    featureEditor.utils._setAddGridListeners(false);

                } catch (err) {
                    complete = false;
                    console.log("createAddGrid: " + err.message);
                }
            }; // createAddGrid


            featureEditor.utils.updateGrid = function(featureSet, pageNumber, /* Array */ arr) {
                var data = [];

                featureEditor.utils._setListeners();

                dojo.forEach(featureSet.features, function(entry, i) {
                    var entryObject = {};
                    for ( var item in arr) {
                        var node0 = arr[item].toString();
                        entryObject[node0] = entry.attributes[node0] + ''; // entry.attributes[node0].toString();
                    }

                    featureEditor.masterRecordArr[i] = {
                        geometry : entry.geometry,
                        infoTemplate : entry.infoTemplate,
                        symbol : entry.symbol
                    };

                    data.push(entryObject);
                });

                // if(featureEditor.grid.store != null) {
                // //featureEditor.grid.store.setData({});
                // //featureEditor.grid.refresh();
                // }
                featureEditor.grid.store.setData(data);
                featureEditor.grid.refresh();

                featureEditor.utils.createGridLegend(featureEditor.grid);
                dojo.byId("grid-legend-parent").style.visibility = "visible";
                dojo.byId("grid-legend-parent").style.position = "relative";

                featureEditor.featureLayer.isEditable() == true ? featureEditor.ui
                        .handleAddRecord(true)
                        : featureEditor.ui.handleAddRecord(false);

                // update application state
                featureEditor.pageInfo.currentPage = pageNumber;
                dojo.byId("pageInfo").innerHTML = featureEditor.pageInfo.currentPage
                        + "/" + featureEditor.pageInfo.totalPages;

                featureEditor.loadingIcon.hide();
            }; // updateGrid

            /**
             * Helper function for adding and removing columns for better
             * visibility in FeatureServices that have many fields.
             *
             * @param id
             */
            featureEditor.utils.addRemoveColumns = function(/* number */id) {

                var column = featureEditor.grid.columns[id];

                if (column.hidden == false) {
                    featureEditor.grid.styleColumn(id, "display:none;");
                    featureEditor.grid.columns[id].hidden = true;
                } else {
                    featureEditor.grid.styleColumn(id, "display:table-cell;");
                    featureEditor.grid.columns[id].hidden = false;
                }
            }; // addRemoveColumns


            /**
             * For handling edit click events. Be aware of differences between
             * Chrome, Firefox and IE.
             *
             * @param object -
             *            usually the row object
             * @param data
             * @param cell -
             *            the cell that was clicked
             * @private
             */
            featureEditor.utils._renderCellHandler = function(object, data, cell) {
                var length = 0;
                var saveBtn = null;
                var saveBtnCell = null;
                var undoBtn = null;
                var undoBtnCell = null;
                var deleteBtn = null;
                var deleteBtnCell = null;

                if (cell.children.length == 0) {
                    // uneditable feature
                    cell.style.backgroundColor = "#FFFF00";
                    cell.style.color = "#FF0000";
                    // featureEditor.utils.revertLocalRecord();
                    return;
                }

                if (object.element.hasChildNodes()
                        && typeof (cell.parentNode.cells) == "undefined") {
                    var child0 = object.element.children[0];

                    // set save button disabled state to false
                    length = child0.childNodes.length;
                    saveBtn = child0.childNodes[length - 3].children[0].children[0].children[0];
                    dijit.byId(saveBtn.id).set('disabled', false);

                    saveBtnCell = child0.childNodes[length - 3].children[0].children[0];
                    saveBtnCell.style.backgroundColor = "#52D017";

                    undoBtn = child0.childNodes[length - 2].children[0].children[0].children[0];
                    dijit.byId(undoBtn.id).set('disabled', false);

                    undoBtnCell = child0.childNodes[length - 2].children[0].children[0];
                    undoBtnCell.style.backgroundColor = "#ffff00";

                    deleteBtn = child0.childNodes[length - 1].children[0].children[0].children[0];
                    dijit.byId(deleteBtn.id).set('disabled', false);

                    deleteBtnCell = child0.childNodes[length - 1].children[0].children[0];
                    deleteBtnCell.style.backgroundColor = "#ff0000";

                } else {
                    // IE 9 hack
                    try {
                        length = cell.parentNode.cells.length;
                        saveBtn = cell.parentNode.cells[length - 3].children[0].children[0].children[0];
                        dijit.byId(saveBtn.id).set('disabled', false);

                        saveBtnCell = cell.parentNode.cells[length - 3].children[0].children[0];
                        saveBtnCell.style.backgroundColor = "#52D017";

                        undoBtn = cell.parentNode.cells[length - 2].children[0].children[0].children[0];
                        dijit.byId(undoBtn.id).set('disabled', false);

                        undoBtnCell = cell.parentNode.cells[length - 2].children[0].children[0];
                        undoBtnCell.style.backgroundColor = "#ffff00";

                        deleteBtn = cell.parentNode.cells[length - 1].children[0].children[0].children[0];
                        dijit.byId(deleteBtn.id).set('disabled', false);

                        deleteBtnCell = cell.parentNode.cells[length - 1].children[0].children[0];
                        deleteBtnCell.style.backgroundColor = "#ff0000";

                    } catch (err) {
                        console.log("_renderCellHandler: " + err.message);
                    }
                }
            }; // _renderCellHandler


            /**
             * For handling edit click events in the Add New Grid. Be aware of
             * differences between Chrome, Firefox and IE.
             *
             * @param object -
             *            usually the row object
             * @param data
             * @param cell -
             *            the cell that was clicked
             * @private
             */
            featureEditor.utils._renderAddCellHandler = function(object, data, cell) {
                var length = 0;
                var saveBtn = null;
                var saveBtnCell = null;
                var undoBtn = null;
                var undoBtnCell = null;
                var deleteBtn = null;
//                var deleteBtnCell = null;

                if (cell.children.length == 0) {
                    // uneditable feature
                    cell.style.backgroundColor = "#FFFF00";
                    cell.style.color = "#FF0000";
                    // featureEditor.utils.revertLocalRecord();
                    return;
                }

                if (object.element.hasChildNodes()
                        && typeof (cell.parentNode.cells) == "undefined") {
                    var child0 = object.element.children[0];

                    // set save button disabled state to false
                    length = child0.childNodes.length;
                    saveBtn = child0.childNodes[length - 3].children[0].children[0].children[0];
                    dijit.byId(saveBtn.id).set('disabled', false);

                    saveBtnCell = child0.childNodes[length - 3].children[0].children[0];
                    saveBtnCell.style.backgroundColor = "#52D017";

                    undoBtn = child0.childNodes[length - 2].children[0].children[0].children[0];
                    dijit.byId(undoBtn.id).set('disabled', false);

                    undoBtnCell = child0.childNodes[length - 2].children[0].children[0];
                    undoBtnCell.style.backgroundColor = "#ffff00";

                    // Leave 'disabled' -- use Remove New Record button
                    deleteBtn = child0.childNodes[length - 1].children[0].children[0].children[0];
                    dijit.byId(deleteBtn.id).set('disabled', true);

                    // deleteBtnCell = child0.childNodes[length -
                    // 1].children[0].children[0];
                    // deleteBtnCell.style.backgroundColor = "#ff0000";

                } else {
                    // IE 9 hack
                    try {
                        length = cell.parentNode.cells.length;
                        saveBtn = cell.parentNode.cells[length - 3].children[0].children[0].children[0];
                        dijit.byId(saveBtn.id).set('disabled', false);

                        saveBtnCell = cell.parentNode.cells[length - 3].children[0].children[0];
                        saveBtnCell.style.backgroundColor = "#52D017";

                        undoBtn = cell.parentNode.cells[length - 2].children[0].children[0].children[0];
                        dijit.byId(undoBtn.id).set('disabled', false);

                        undoBtnCell = cell.parentNode.cells[length - 2].children[0].children[0];
                        undoBtnCell.style.backgroundColor = "#ffff00";

                        // Leave 'disabled' -- use Remove New Record button
                        deleteBtn = cell.parentNode.cells[length - 1].children[0].children[0].children[0];
                        dijit.byId(deleteBtn.id).set('disabled', true);

                        // deleteBtnCell = cell.parentNode.cells[length -
                        // 1].children[0].children[0];
                        // deleteBtnCell.style.backgroundColor = "#ff0000";

                    } catch (err) {
                        console.log("_renderAddCellHandler: " + err.message);
                    }
                }
            }; // _renderAddCellHandler


            /**
             * Internal method for setting up listeners.
             *
             * @private
             */
            featureEditor.utils._setListeners = function() {

                if (featureEditor.dgridRowClickListener != null)
                    featureEditor.dgridRowClickListener.remove();
                if (featureEditor.dgridCellClickListener != null)
                    featureEditor.dgridCellClickListener.remove();

                featureEditor.dgridRowClickListener = featureEditor.grid.on(
                        ".dgrid-row:click", function(event) {
                            var stuff = featureEditor.grid.row(event);
                            console.log(stuff.data);
                            featureEditor.currentRecord = stuff.data;
                        });

                featureEditor.dgridCellClickListener = featureEditor.grid
                        .on(
                                ".dgrid-cell:dblclick",
                                function(event) {
                                    var stuff = featureEditor.grid.cell(event);

                                    var undo = typeof (stuff.column.undo);
                                    var save = typeof (stuff.column.save);

                                    // Check for double clicks on the Save and
                                    // Undo buttons
                                    if (typeof (stuff.column) !== "undefined"
                                            && (save == "undefined" && undo == "undefined")) {
                                        console.log(stuff.element.innerHTML);
                                        featureEditor.utils._renderCellHandler(
                                                stuff.row, null, stuff.element);
                                    }

                                });

                // controller.grid.on(mouseUtil.enterRow, function(event){
                // var row = controller.grid.row(event);
                // console.log("mouseover " + row);
                // });

                featureEditor.grid.on("dgrid-datachange", function(evt) {
                    console.log("data changed: ", evt.oldValue, " -> ", evt.value);
                    console.log("cell: ", evt.cell.row.id, evt.cell.column.field);
                    setTimeout(function() {
                        vslib.log("dgrid-datachange. updateRecord...");
                        featureEditor.updateRecord();
                    }, 100);
                });
            }; // _setListeners


            featureEditor.utils._setAddGridListeners = function(/* boolean */enableRow) {
                featureEditor.dgridAddRowClickListener = featureEditor.addGrid.on(".dgrid-row:click",
                    function(event) {
                        var stuff = featureEditor.addGrid.row(event);
                        console.log(stuff.data);
                        featureEditor.currentAddRecord = stuff.data;
                        if (enableRow == true)
                            featureEditor.currentAddRow = this;
                    }
                );

                featureEditor.dgridAddCellClickListener = featureEditor.addGrid.on(
                    ".dgrid-cell:dblclick",
                    function(event) {
                        var stuff = featureEditor.addGrid.cell(event);

                        var undo = typeof (stuff.column.undo);
                        var save = typeof (stuff.column.save);

                        // Check for double clicks on the Save and
                        // Undo buttons
                        if (typeof (stuff.column) !== "undefined"
                            && (save == "undefined" && undo == "undefined")) {
                            console.log(stuff.element.innerHTML);
                            featureEditor.utils._renderAddCellHandler(
                                stuff.row, null,
                                stuff.element);
                        }
                    }
                );
            }; // _setAddGridListeners


            /**
             * Creates a waiting icon
             *
             * @param target
             *            Id of the element
             * @returns {Node}
             * @private
             */
            featureEditor.utils._createStandbyIcon = function(/* String */ target) {
                var standbyIcon = new Standby({
                    target : target,
                    color : "grey"
                });
                document.body.appendChild(standbyIcon.domNode);
                standbyIcon.startup();
                return standbyIcon;
            }; // _createStandbyIcon


            /**
             * Basic date formatter
             *
             * @param value
             * @returns {String}
             */
            featureEditor.utils.formatDate = function(value) {
                var inputDate = new Date(value);
                return dojo.date.locale.format(inputDate, {
                    selector : 'date',
                    datePattern : 'MMMM d, y'
                });
            }; // formatDate


            // ////////////////////////////////////////////////////
            // USER INTERFACE CONTROLS
            // Functions for organizing user interface controls
            // ////////////////////////////////////////////////////

            /**
             * Handles CSS for Add Record and Remove New Record buttons. Default
             * is true in which Add Record Button is active and Remove button is
             * disabled.
             *
             * @param value
             *            boolean
             */
            featureEditor.ui.handleAddRecord = function(/* boolean */value) {

                if (value == true) {
                    dijit.byId("remove-new-record-btn").set("disabled", true);
                    dojo.style("remove-new-record-btn", "color", "#C0C0C0");
                    dijit.byId("add-new-record-btn").set("disabled", false);
                    dojo.style("add-new-record-btn", "color", "#FF0000");
                } else {
                    dijit.byId("remove-new-record-btn").set("disabled", false);
                    dojo.style("remove-new-record-btn", "color", "#FF0000");
                    dijit.byId("add-new-record-btn").set("disabled", true);
                    dojo.style("add-new-record-btn", "color", "#C0C0C0");
                }
            }; // handleAddRecord


            /**
             * Handles adding or removing the EditGrid. True equals visible.
             *
             * @param value
             *            boolean
             */
            featureEditor.ui.handleAddRemoveEditGrid = function(/* boolean */ value) {
                if (value == true) {
                    dojo.style("add-grid", "visibility", "visible");
                    dojo.style("add-grid", "display", "block");
                } else {
                    dojo.style("add-grid", "visibility", "hidden");
                    dojo.style("add-grid", "display", "none");
                }
            }; // handleAddRemoveEditGrid

        }); // dojo.require
