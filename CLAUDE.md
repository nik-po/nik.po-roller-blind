# CLAUDE.md — DIY Motorized Roller Blind

## Project overview
DIY motorized roller blind system based on ESP32-C3 SuperMini + TB6612FNG + JGY-370 12V motor + ESPHome + Home Assistant.

## Repository structure
```
roller-blind/
├── INSTRUCTIONS.txt                # the full build guide
├── firmware/
│   ├── roller-motor-dist.yaml      # public config: no WiFi baked in, placeholder keys
│   └── www/                        # source for the custom web UI (custom.css, custom.js, preview.html)
├── hardware/
│   └── wiring/
│       └── wiring-diagram.svg      # connection diagram
├── LICENSE.md
└── README.md
```

This is a trimmed public snapshot of a larger private working repo. The
private repo additionally carries `firmware/roller-motor.yaml` and
`roller-motor-1/2/3.yaml` — the maintainer's own configs, with real API
keys and `!secret`-based WiFi for four physical blinds — which are
deliberately excluded here.

There is no `dist/` folder in this repo. The packaged download (firmware
config + web UI + wiring diagram + INSTRUCTIONS.txt, gathered into one
`roller-blind/` folder and zipped) is built from these same source files
and published as a GitHub Release asset, not tracked in git — rebuild it
whenever a released file changes, don't add a zip to the tree.

## Hardware
- ESP32-C3 SuperMini (TENSTAR ROBOT)
- TB6612FNG H-bridge motor driver
- JGY-370 12V 40RPM worm gear motor (self-locking)
- Mini-360 buck converter (12V → 3.3V)
- DC Jack 5.5×2.1mm
- 2× tactile buttons

## Pin mapping
| GPIO | Function |
|------|----------|
| GPIO5 | PWMA (motor PWM) |
| GPIO6 | AIN2 (direction) |
| GPIO7 | AIN1 (direction) |
| GPIO10 | STBY (driver enable) |
| GPIO20 | Button UP |
| GPIO21 | Button DOWN |

## Key features
- time_based cover with position tracking, no encoders or limit switches
- Physical buttons: short press = toggle to end, long press at position 0/1 = fine-tune calibration
- Manual nudge (`Nudge Up` / `Nudge Down`) moves the motor even at reported 0%/100%, without touching calibration
- Swap buttons toggle (if wired backwards)
- Reverse motor toggle (if motor wired backwards)
- Runtime "Duration Range" number resizes the Open/Close Duration sliders without reflashing
- Master pattern: physical buttons fire `esphome.roller_master_*` events regardless of listeners; wiring them to other blinds is a Home Assistant automation (not included here — see README)
- Built-in web UI, served from flash via `web_server: css_include/js_include` (entities are addressed by `name:`, not `id:` — see the warning in `roller-motor-dist.yaml`)
- OTA firmware updates
- On first boot, WiFi is set up from a phone via the device's own AP + captive portal — no fixed hostname until then

## ESPHome events (fired unconditionally on physical button press)
- esphome.roller_master_up
- esphome.roller_master_down
- esphome.roller_master_stop

## Rules for Claude Code
- NEVER commit a file containing a real API encryption key, OTA password, or WiFi credential
- NEVER change the placeholder key/password format in roller-motor-dist.yaml — the build must fail until the user replaces them
- NEVER commit a packaged zip into the tree — release it as a GitHub Release asset instead
- Keep README.md updated when adding features
- All wiring diagrams go to hardware/wiring/ as SVG
- When updating firmware, always test compile before committing

## Publishing targets
- GitHub (this repo): public snapshot, no personal keys or WiFi; release zip lives under Releases, not in the tree
- Makerworld: publish STL + photos + README, link back here for firmware/docs

## Commands
```bash
# Compile only (no flash)
esphome compile firmware/roller-motor-dist.yaml

# Check config
esphome config firmware/roller-motor-dist.yaml

# Flash (after replacing the placeholder keys)
esphome run firmware/roller-motor-dist.yaml
```
