<%@ WebHandler Language="C#" Class="store" Debug="true" CodeBehind="lib.cs" CompilerOptions="c:\Inetpub\wwwroot\miniportal\store\lib.cs" %>

using System;
using System.IO;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;
using System.Web.Caching;

public class store: IHttpHandler {

    // Override the ProcessRequest method.
    public void ProcessRequest(HttpContext context) {
        var jsonString = String.Empty;
        // only for POST method
        jsonString = context.Request.Form["map"];
        if(jsonString == null) { jsonString = ""; }
        var hash = VUtils.computeSHA1Hash(jsonString);

        var path =
            VUtils.storeconfFromJson(
                VUtils.loadConfig(
                    VUtils.storageConfigFilename(context))
            ).fileStoragePath;
        var fname = String.Format(@"{1}/map.{0}.js", hash, path);

        System.IO.File.WriteAllText(fname, jsonString);

        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = Encoding.UTF8;
        context.Response.Write(string.Format("{{sha1: '{0}'}}", hash));
    }

    // Override the IsReusable property.
    public bool IsReusable {
        get { return false; }
    }
}
