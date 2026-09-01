package com.moked.artzi;

import android.Manifest;
import android.database.Cursor;
import android.provider.CallLog;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Reads the device call log and counts how many calls came from a given number.
 * Requires the READ_CALL_LOG runtime permission. Only used by the installed APK.
 */
@CapacitorPlugin(
    name = "CallLog",
    permissions = {
        @Permission(alias = "calllog", strings = { Manifest.permission.READ_CALL_LOG })
    }
)
public class CallLogPlugin extends Plugin {

    @PluginMethod
    public void getCount(PluginCall call) {
        if (getPermissionState("calllog") != PermissionState.GRANTED) {
            requestPermissionForAlias("calllog", call, "permCallback");
            return;
        }
        doCount(call);
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        if (getPermissionState("calllog") == PermissionState.GRANTED) {
            doCount(call);
        } else {
            call.reject("ההרשאה לקריאת יומן השיחות נדחתה");
        }
    }

    private void doCount(PluginCall call) {
        String requested = digitsOnly(call.getString("number", ""));
        if (requested.length() == 0) {
            call.reject("מספר לא תקין");
            return;
        }
        String reqTail = tail(requested, 9);

        int incoming = 0;
        int total = 0;
        int missed = 0;
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[] { CallLog.Calls.NUMBER, CallLog.Calls.TYPE },
                null, null, null
            );
            if (cursor != null) {
                int numIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
                while (cursor.moveToNext()) {
                    String rowNum = numIdx >= 0 ? cursor.getString(numIdx) : null;
                    String rowTail = tail(digitsOnly(rowNum), 9);
                    if (rowTail.length() == 0 || !rowTail.equals(reqTail)) continue;
                    total++;
                    int type = typeIdx >= 0 ? cursor.getInt(typeIdx) : -1;
                    if (type == CallLog.Calls.INCOMING_TYPE) incoming++;
                    else if (type == CallLog.Calls.MISSED_TYPE) missed++;
                }
            }
        } catch (Exception e) {
            call.reject("שגיאה בקריאת יומן השיחות: " + e.getMessage());
            return;
        } finally {
            if (cursor != null) cursor.close();
        }

        JSObject ret = new JSObject();
        ret.put("incoming", incoming);
        ret.put("missed", missed);
        ret.put("total", total);
        call.resolve(ret);
    }

    private static String digitsOnly(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= '0' && c <= '9') sb.append(c);
        }
        return sb.toString();
    }

    private static String tail(String s, int n) {
        if (s == null) return "";
        if (s.length() <= n) return s;
        return s.substring(s.length() - n);
    }
}
