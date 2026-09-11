# Smart Roller Blind Motor

A DIY motorized roller blind unit built around an ESP32-C3, a TB6612FNG
motor driver, and a 12V worm gear motor — running [ESPHome](https://esphome.io)
and integrating natively with [Home Assistant](https://www.home-assistant.io/).
No cloud, no subscription, no app to sign into. It keeps working if your
internet goes down.

## What it does

- **Native Home Assistant integration** — shows up as a `cover` entity with
  full position control
- **Built-in web interface** — control it from any browser on your network,
  Home Assistant or not
- **Physical buttons** — short press opens/closes fully, press again to stop
  anywhere; long-press at either end fine-tunes calibration without touching
  a computer
- **Manual nudge** — correct drift at either end even when the firmware
  thinks there's nowhere left to travel
- **Reverse switches for motor and buttons** — wired something backwards?
  Flip a toggle instead of re-soldering
- **OTA updates** — flash once over USB, update over WiFi from then on
- **Multiple blinds, one master** — pressing the physical buttons on the
  device fires `esphome.roller_master_up` / `_down` / `_stop` events every
  time, whether or not anything is listening. Add a Home Assistant
  automation that triggers on those events and calls `cover.open_cover` /
  `cover.close_cover` / `cover.stop_cover` on your other blinds, and one
  set of buttons drives the whole group

## Hardware

| Part | Approx. price |
|---|---|
| ESP32-C3 SuperMini | $2.00 |
| TB6612FNG motor driver board | $1.50 |
| JGY-370 12V 40RPM worm gear motor | $8.00 |
| Mini-360 buck converter | $0.50 |
| DC jack, 5.5 × 2.1 mm | $0.50 |
| 2× tactile push buttons | $0.20 |
| 12V power adapter, 1A+ | $3.00 |
| Silicone wire 26AWG + heat shrink | $2.00 |
| **Total, per blind** | **under $20.00** |

No encoders or limit switches — position is tracked by time, calibrated
once from the physical buttons or the web interface.

You'll also need a printed enclosure to hold it all together. The STL,
photos, and an illustrated step-by-step assembly PDF are on
**[the MakerWorld page](MAKERWORLD-LINK)** — this repo covers the
electronics and firmware, that page covers the print and the physical
build.

## Getting started

Read **[`INSTRUCTIONS.txt`](INSTRUCTIONS.txt)** — it's the full build guide:
flashing, generating your own security keys, soldering, WiFi setup, and
calibration, written for someone who has never flashed a microcontroller
before.

Prefer a ready-to-download bundle (firmware config + web UI + wiring
diagram + the same guide, all in one folder)? Grab the zip from the
[latest release](../../releases/latest) instead of assembling it from the
source tree yourself.

The wiring diagram alone lives at [`hardware/wiring/wiring-diagram.svg`](hardware/wiring/wiring-diagram.svg) —
open it in any browser.

## Repository layout

```
INSTRUCTIONS.txt           the full build guide
firmware/
  roller-motor-dist.yaml   ESPHome config — no WiFi baked in (set up from
                           your phone on first boot), placeholder security
                           keys you generate yourself (required)
  www/                     source for the built-in web interface
hardware/wiring/
  wiring-diagram.svg       soldering diagram
```

This tree holds the source files; the packaged download on the
[Releases page](../../releases) is built from these same files, just
gathered into one flat folder for convenience.

## Firmware note

`firmware/roller-motor-dist.yaml` ships with placeholder values for the API
encryption key and OTA password on purpose — building this project means
generating your own (the instructions show you how) rather than sharing
one key across every blind built from this repo.

## License

This project is licensed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) —
you're free to share and adapt it, as long as you credit the source, don't
use it commercially, and share your own version under the same license.
Full legal text: <https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode>.

If you build one, I'd love to see it.
