using System;
using System.IO;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;
using System.Web.Caching;

public class VUtils {

    public class VStoreConfig {
        public string fileStoragePath { get; set; }
    }

    public static string computeSHA1Hash(string val) {
        if(val.Equals("")) { return ""; }
        byte[] data = System.Text.Encoding.UTF8.GetBytes(val);
        System.Security.Cryptography.SHA1 sha = new System.Security.Cryptography.SHA1Managed();
        byte[] res = sha.ComputeHash(data);
        return System.BitConverter.ToString(res).Replace("-", "").ToUpper();
    }

    public static string storageConfigFilename(HttpContext context) {
        return context.Server.MapPath("~/store.config");
    }

    private static object _lockobject = new object();

    public static string loadConfig(string fileName) {
        string config = string.Empty;
        lock(_lockobject) {
            if(System.IO.File.Exists(fileName)) {
                using(System.IO.StreamReader file = new System.IO.StreamReader(fileName)) {
                    config = file.ReadToEnd();
                }
            }
        }
        return config;
    }

    public static VStoreConfig storeconfFromJson(string confJson) {
        var jss = new System.Web.Script.Serialization.JavaScriptSerializer();
        var cnf = jss.Deserialize<VStoreConfig>(confJson);
        return cnf;
    }
}
