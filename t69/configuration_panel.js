{
   "configurationSettings":[
      {
         "category":"<b>General Settings</b>",
         "fields":[
            {
               "type":"string",
               "fieldName":"theme",
               "tooltip":"Color theme to use",
               "label":"Color Scheme:",
               "options":[
                  {
                     "label":"Blue",
                     "value":"blue"
                  },
                  {
                     "label":"Gray",
                     "value":"gray"
                  },
                  {
                     "label":"Green",
                     "value":"green"
                  },
                  {
                     "label":"Orange",
                     "value":"orange"
                  },
                  {
                     "label":"Purple",
                     "value":"purple"
                  }
               ]
            },
            {
               "type":"boolean",
               "fieldName":"displaytitle",
               "label":"Show Title",
               "tooltip":""
            },
            {
               "type":"string",
               "fieldName":"title",
               "label":"Title Text:",
               "tooltip":"",
               "placeHolder":"Defaults to map name"
            },
            {
               "type":"string",
               "fieldName":"customlogoimage",
               "tooltip":"Url for image",
               "placeHolder":"URL to image",
               "label":"Logo on map:"
            },
            {
               "type":"boolean",
               "fieldName":"displayoverviewmap",
               "label":"Include Overview Map",
               "tooltip":""
            }
         ]
      },
      {
         "category":"<b>Menu Items</b>",
         "fields":[
            {
               "type":"boolean",
               "fieldName":"displaylegend",
               "label":"Legend *",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displaydetails",
               "label":"Details *",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displayeditor",
               "label":"Editor *",
               "tooltip":"Display editor if web map contains feature service layer"
            },
            {
               "type":"boolean",
               "fieldName":"displaytimeslider",
               "label":"Time Slider *",
               "tooltip":"Display time slider for time enabled web map"
            },
            {
               "type":"boolean",
               "fieldName":"displayprint",
               "label":"Print",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displaylayerlist",
               "label":"Layer List *",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displaybasemaps",
               "label":"Basemaps",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displaybookmarks",
               "label":"Bookmarks",
               "tooltip":"Display the read-only bookmarks contained in the web map."
            },
            {
               "type":"boolean",
               "fieldName":"displaymeasure",
               "label":"Measure",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displayshare",
               "label":"Share",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"displayelevation",
               "label":"Elevation",
               "tooltip":"Display an elevation profile for a measured line. Note the measure tool must be displayed."
            },
            {
               "type":"boolean",
               "fieldName":"showelevationdifference",
               "label":"Show Elevation Difference",
               "tooltip":"When true elevation gain and loss is show from the first location to the location under the cursor/finger."
            },
            {
               "type":"boolean",
               "fieldName":"displaysearch",
               "label":"Search",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"searchextent",
               "label":"Search for locations within current extent",
               "tooltip":"Search for locations only within the current extent"
            },
            {
               "type":"paragraph",
               "value":"* These menu items will appear in the application when the web map has layers that require them."
            }
         ]
      },
      {
         "category":"<b>Print Settings</b>",
         "fields":[
            {
               "type":"boolean",
               "fieldName":"displayprintlegend",
               "label":"Display Legend on Printout",
               "tooltip":""
            },
            {
               "type":"boolean",
               "fieldName":"printlayout",
               "tooltip":"Display all print layouts",
               "label":"Layout:"
            },
            {
               "type":"string",
               "fieldName":"printformat",
               "tooltip":"Specify the output format",
               "label":"Format:"
            },
            {
               "type":"paragraph",
               "value":"Define print settings for the print service. When Layout is true all available print layout templates will be displayed in the pick list. View the rest services directory for the print service to see a list of valid layout and format options."
            }
         ]
      }
   ],
   "values":{
      "theme":"gray",
      "searchextent":false,
      "displaymeasure":true,
      "displayshare":true,
      "displayoverviewmap":true,
      "displayeditor":true,
      "displaytimeslider":true,
      "displayprintlegend":false,
      "displayprint":true,
      "displaysearch":true,
      "displaylegend":true,
      "displaydetails":true,
      "displaylayerlist":true,
      "displaybasemaps":true,
      "displayelevation":false,
      "showelevationdifference":false,
      "printlayout":false
   }
}