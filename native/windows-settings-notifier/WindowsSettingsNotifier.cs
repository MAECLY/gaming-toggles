using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Maecly
{
    public static class WindowsSettingsNotifier
    {
        private const uint WM_SETTINGCHANGE = 0x001A;
        private const uint SMTO_BLOCK = 0x0001;
        private const uint SMTO_ABORTIFHUNG = 0x0002;
        private const uint SPI_GETMOUSE = 0x0003;
        private const uint SPI_SETMOUSE = 0x0004;
        private const uint SPIF_UPDATEINIFILE = 0x0001;
        private const uint SPIF_SENDCHANGE = 0x0002;
        private const ushort VK_LWIN = 0x5B;
        private const ushort VK_F11 = 0x7A;
        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);

        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT
        {
            public uint type;
            public InputUnion input;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct InputUnion
        {
            [FieldOffset(0)]
            public KEYBDINPUT keyboard;

            // The union must have the same size as Win32's largest INPUT member.
            // On 64-bit Windows MOUSEINPUT is larger than KEYBDINPUT.
            [FieldOffset(0)]
            public MOUSEINPUT mouse;

            [FieldOffset(0)]
            public HARDWAREINPUT hardware;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort virtualKey;
            public ushort scanCode;
            public uint flags;
            public uint time;
            public UIntPtr extraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint flags;
            public uint time;
            public UIntPtr extraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct HARDWAREINPUT
        {
            public uint message;
            public ushort parameterLow;
            public ushort parameterHigh;
        }

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

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SystemParametersInfo(
            uint action,
            uint parameter,
            [In, Out] int[] values,
            uint updateFlags);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(
            uint inputCount,
            [In] INPUT[] inputs,
            int inputSize);

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

        public static string GetPointerPrecisionState()
        {
            return FormatMouseParameters(ReadMouseParameters());
        }

        public static string SetPointerPrecisionEnabled(bool enabled)
        {
            int[] values = ReadMouseParameters();
            // Preserve both user thresholds. Windows accepts acceleration levels
            // 0 (off), 1 (first threshold) and 2 (both thresholds).
            values[2] = enabled ? 1 : 0;
            if (!SystemParametersInfo(
                SPI_SETMOUSE,
                0,
                values,
                SPIF_UPDATEINIFILE | SPIF_SENDCHANGE))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }

            return FormatMouseParameters(ReadMouseParameters());
        }

        public static int SendXboxFullScreenShortcut()
        {
            INPUT[] inputs = new INPUT[]
            {
                CreateKeyboardInput(VK_LWIN, 0),
                CreateKeyboardInput(VK_F11, 0),
                CreateKeyboardInput(VK_F11, KEYEVENTF_KEYUP),
                CreateKeyboardInput(VK_LWIN, KEYEVENTF_KEYUP)
            };
            uint sent = SendInput(
                (uint)inputs.Length,
                inputs,
                Marshal.SizeOf(typeof(INPUT)));
            if (sent != (uint)inputs.Length)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            return (int)sent;
        }

        private static int[] ReadMouseParameters()
        {
            int[] values = new int[3];
            if (!SystemParametersInfo(SPI_GETMOUSE, 0, values, 0))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            return values;
        }

        private static string FormatMouseParameters(int[] values)
        {
            return String.Format(
                System.Globalization.CultureInfo.InvariantCulture,
                "threshold1={0} threshold2={1} acceleration={2}",
                values[0],
                values[1],
                values[2]);
        }

        private static INPUT CreateKeyboardInput(ushort virtualKey, uint flags)
        {
            INPUT input = new INPUT();
            input.type = INPUT_KEYBOARD;
            input.input.keyboard.virtualKey = virtualKey;
            input.input.keyboard.scanCode = 0;
            input.input.keyboard.flags = flags;
            input.input.keyboard.time = 0;
            input.input.keyboard.extraInfo = UIntPtr.Zero;
            return input;
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
