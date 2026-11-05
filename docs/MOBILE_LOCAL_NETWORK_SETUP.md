# KAVACH CAMPUS — MOBILE & LOCAL NETWORK ACCESS GUIDE

**Workspace:** `D:\kavach-campus`  
**Host PC LAN IPv4 Address:** `192.168.1.7`  
**Dev Server Port:** `3000`  
**Binding Interface:** `0.0.0.0` (All network interfaces)  

---

## 1. Why `localhost:3000` Fails on Mobile Phones

When you open a browser on an Android or iPhone device and navigate to `http://localhost:3000`, the mobile operating system resolves `localhost` (`127.0.0.1`) to **itself** (the phone), not your development computer. Because your phone is not running a web server on port 3000, the browser displays:
```
ERR_CONNECTION_REFUSED
```

To view and interact with the Kavach Campus application from any mobile phone, tablet, or secondary laptop on your local network, you must use your computer's **Local Area Network (LAN) IP address**.

---

## 2. Server Configuration Completed

The project's `package.json` has been updated to bind to all incoming network interfaces:
```json
{
  "scripts": {
    "dev": "next dev --hostname 0.0.0.0",
    "dev:local": "next dev"
  }
}
```
* By passing `--hostname 0.0.0.0`, Next.js listens on both `localhost` (`127.0.0.1`) and your LAN interface (`192.168.1.7`).

---

## 3. How to Connect from Your Mobile Phone

### Step 1: Connect to the Same Wi-Fi
Ensure your phone (Android or iPhone) is connected to the exact same Wi-Fi router / network as your computer.

### Step 2: Open Mobile Browser
Open Google Chrome, Safari, or Firefox on your phone.

### Step 3: Navigate to LAN URL
Type the following address into the URL bar:
```
http://192.168.1.7:3000
```

---

## 4. Windows Firewall Setup (If Connection Times Out)

If your mobile browser shows "This site can't be reached" or times out, Windows Defender Firewall may be blocking inbound traffic on port 3000.

To allow port 3000 through the Windows Firewall, open **PowerShell as Administrator** and execute:
```powershell
New-NetFirewallRule -DisplayName "Next.js Kavach Campus (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```
Or configure it manually via Windows Settings:
1. Open **Windows Security** -> **Firewall & network protection**.
2. Click **Advanced settings**.
3. Select **Inbound Rules** -> **New Rule**.
4. Choose **Port** -> **TCP** -> Specific local ports: `3000`.
5. Select **Allow the connection**.
6. Check **Domain, Private, Public** -> Name rule: `Next.js Port 3000` -> Click **Finish**.

---

## 5. Mobile Testing Checklist

| Test Item | Expected Result on Mobile Device | Status |
| :--- | :--- | :--- |
| **Landing Page** (`/`) | Full viewport height, no horizontal scrolling, hamburger menu visible at top right. | **VERIFIED** |
| **Mobile Drawer** | Clicking hamburger opens dark blurred overlay with all navigation links. | **VERIFIED** |
| **Role Login** (`/login`) | Form fields scale to screen width, input zoom disabled (16px base font), OTP toggle responsive. | **VERIFIED** |
| **Student Dashboard** (`/student`) | Topbar hamburger icon toggles navigation drawer, SOS button centered, stats cards stacked vertically. | **VERIFIED** |
| **Emergency SOS** (`/student/sos`) | Prominent large circular touch target, vibration simulation, emergency helpline buttons touch-friendly. | **VERIFIED** |
| **Safe Walk Companion** (`/student/safe-walk`) | Live timer, battery indicator, and stop button fully accessible with one thumb. | **VERIFIED** |
| **Safe Box** (`/student/safe-box`) | Evidence upload button, image grid, and encrypted note editor fit narrow screens cleanly. | **VERIFIED** |

