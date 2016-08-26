<%@ WebHandler Language="C#" Class="load" Debug="true" CodeBehind="lib.cs" CompilerOptions="c:\Inetpub\wwwroot\miniportal\store\lib.cs" %>

using System;
using System.IO;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;
using System.Web.Caching;

public class load: IHttpHandler {

    // Override the ProcessRequest method.
    public void ProcessRequest(HttpContext context) {
        var saveid = String.Empty;
        // only for GET method
        saveid = context.Request.QueryString["map"];
        if(saveid == null) saveid = "";
        saveid = saveid.Replace("\\", "").Replace("/", "");

        var path =
            VUtils.storeconfFromJson(
                VUtils.loadConfig(
                    VUtils.storageConfigFilename(context))
            ).fileStoragePath;
        var fname = String.Format(@"{1}/map.{0}.js", saveid, path);

        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = Encoding.UTF8;
        context.Response.WriteFile(fname);
    }

    // Override the IsReusable property.
    public bool IsReusable {
        get { return false; }
    }
}
