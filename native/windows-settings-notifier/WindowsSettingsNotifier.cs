using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Maecly
{
    public static class WindowsSettingsNotifier
    {
        private const uint WM_SETTINGCHANGE = 0x001A;
        private const uint SMTO_BLOCK = 0x0001;
        private const uint SMTO_ABORTIFHUNG = 0x0002;
        private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(
            EnumWindowsProc callback,
            IntPtr lparam);

        [DllImport("user32.dll")]
        private static extern bool EnumChildWindows(
            IntPtr parent,
            EnumWindowsProc callback,
            IntPtr lparam);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(
            IntPtr hwnd,
            out uint processId);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hwnd);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr SendMessageTimeout(
            IntPtr hwnd,
            uint message,
            IntPtr wparam,
            string lparam,
            uint flags,
            uint timeout,
            out UIntPtr result);

        public static int Notify()
        {
            int matched = 0;
            int notified = 0;
            EnumWindows((hwnd, _) =>
            {
                if (IsWindowVisible(hwnd) &&
                    (IsSettingsProcess(hwnd) || HasSettingsChild(hwnd)))
                {
                    matched++;
                    UIntPtr result;
                    if (SendMessageTimeout(
                        hwnd,
                        WM_SETTINGCHANGE,
                        IntPtr.Zero,
                        "GameBar",
                        SMTO_BLOCK | SMTO_ABORTIFHUNG,
                        250,
                        out result) != IntPtr.Zero)
                    {
                        notified++;
                    }
                }
                return true;
            }, IntPtr.Zero);
            return (matched << 16) | notified;
        }

        private static bool HasSettingsChild(IntPtr parent)
        {
            bool found = false;
            EnumChildWindows(parent, (child, _) =>
            {
                found = IsSettingsProcess(child);
                return !found;
            }, IntPtr.Zero);
            return found;
        }

        private static bool IsSettingsProcess(IntPtr hwnd)
        {
            uint processId;
            GetWindowThreadProcessId(hwnd, out processId);
            if (processId == 0)
            {
                return false;
            }

            try
            {
                return String.Equals(
                    Process.GetProcessById((int)processId).ProcessName,
                    "SystemSettings",
                    StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }
    }
}
