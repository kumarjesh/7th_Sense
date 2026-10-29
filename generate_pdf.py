# -*- coding: utf-8 -*-
"""
TriNetra — Offline Mode Demonstration & Evaluation Manual Generator
Generates a professional multi-page PDF using PyFPDF.
"""

from fpdf import FPDF
import os

class TriNetraPDF(FPDF):
    def header(self):
        # Top branding bar
        self.set_fill_color(9, 10, 15) # Dark Obsidian
        self.rect(0, 0, 210, 14, 'F')
        self.set_font('Arial', 'B', 8)
        self.set_text_color(245, 158, 11) # Amber
        self.set_xy(10, 3)
        self.cell(0, 8, 'TRINETRA  |  AUTONOMOUS EDGE AI ASSISTIVE MOBILITY', 0, 0, 'L')
        self.set_text_color(148, 163, 184) # Slate
        self.set_xy(10, 3)
        self.cell(190, 8, 'OFFLINE DEMONSTRATION MANUAL', 0, 0, 'R')
        self.ln(12)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(226, 232, 240)
        self.line(10, 283, 200, 283)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(100, 116, 139)
        self.cell(100, 8, 'TriNetra Assistive AI - Zero-Network Verification Guide', 0, 0, 'L')
        self.cell(90, 8, f'Page {self.page_no()}', 0, 0, 'R')

    def chapter_title(self, num, title):
        self.set_font('Arial', 'B', 12)
        self.set_text_color(15, 23, 42)
        self.set_fill_color(241, 245, 249)
        self.cell(0, 8, f'  {num}. {title}', 0, 1, 'L', fill=True)
        self.ln(2)

    def section_sub(self, title):
        self.set_font('Arial', 'B', 10)
        self.set_text_color(30, 41, 59)
        self.cell(0, 6, title, 0, 1, 'L')
        self.ln(1)

    def body_p(self, text):
        self.set_font('Arial', '', 9.5)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def callout_box(self, title, text, r=245, g=158, b=11):
        self.set_draw_color(r, g, b)
        self.set_line_width(0.8)
        self.set_fill_color(248, 250, 252)
        
        # calculate height
        self.set_font('Arial', '', 9)
        # draw rect
        x = self.get_x()
        y = self.get_y()
        self.set_font('Arial', 'B', 9)
        self.set_text_color(r, g, b)
        self.cell(0, 5, f'  [!] {title}', 0, 1, 'L')
        self.set_font('Arial', '', 9)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 4.5, text)
        end_y = self.get_y()
        self.rect(x, y, 190, end_y - y + 2, 'D')
        self.ln(4)

def build_pdf():
    pdf = TriNetraPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Document Header Box
    pdf.set_fill_color(15, 23, 42) # Deep Navy
    pdf.rect(10, 18, 190, 32, 'F')
    
    pdf.set_xy(14, 21)
    pdf.set_font('Arial', 'B', 17)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, 'TriNetra (Third Eye) - Offline Evaluation Guide', 0, 1, 'L')
    
    pdf.set_xy(14, 29)
    pdf.set_font('Arial', '', 9.5)
    pdf.set_text_color(226, 232, 240)
    pdf.cell(0, 5, 'Complete Step-by-Step Manual for Proving 100% Autonomous Edge AI Navigation', 0, 1, 'L')

    pdf.set_xy(14, 36)
    pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(245, 158, 11)
    pdf.cell(0, 5, 'ARCHITECTURE: PWA + WEBGL TENSORFLOW.JS  |  HARDWARE: LOCAL SMARTPHONE SENSORS', 0, 1, 'L')

    pdf.set_y(54)

    # 1. Executive Summary
    pdf.chapter_title(1, 'Executive Summary & The Offline Imperative')
    pdf.body_p(
        'For a visually impaired person, navigation safety cannot depend on an internet connection. '
        'Blind pedestrians routinely enter underground subway stations, basement elevators, steel-reinforced '
        'building corridors, and rural transit routes where cellular connectivity completely drops.'
    )
    pdf.body_p(
        'If an assistive mobility aid requires transmitting camera frames to a cloud server to calculate distances, '
        'the user is rendered electronically blind and vulnerable the instant signal is lost. TriNetra solves this '
        'through a Dual-Layer Perception Architecture: all safety-critical collision avoidance runs 100% on-device.'
    )

    pdf.callout_box(
        'THE TRINETRA ARCHITECTURAL GUARANTEE',
        'Physical safety, 3D spatial acoustic sonar, looming collision alerts, target object seeking, '
        'and tactile full-screen gestures operate completely on the phone GPU and CPU. Zero cloud requests '
        'are made during core walking navigation.',
        16, 185, 129 # Emerald green
    )

    # 2. Rule 0
    pdf.chapter_title(2, 'Rule 0: One-Time Warmup & Service Worker Caching')
    pdf.body_p(
        'Before taking the phone into an offline demonstration, execute a single pre-caching cycle:'
    )
    pdf.set_font('Arial', '', 9)
    pdf.multi_cell(0, 4.5, 
        '  * Step A: Open TriNetra once in Google Chrome or Safari with internet active.\n'
        '  * Step B: The PWA Service Worker (Workbox) caches all HTML, CSS, JavaScript, and the 2.5 MB '
        'TensorFlow.js MobileNetV2 neural network weights directly into local browser storage.\n'
        '  * Step C: (Recommended) Tap browser settings and select "Add to Home Screen" to install it as an app.\n'
        '  * Result: Once cached, TriNetra never needs internet again for core collision avoidance.'
    )
    pdf.ln(3)

    # 3. Live Demonstration Sequence
    pdf.chapter_title(3, 'Live Airplane Mode Demonstration (Step-by-Step)')
    pdf.body_p('Perform this exact sequence in front of judges, evaluators, or test audiences:')

    steps = [
        ('Step 1: Enter 100% Airplane Mode in View of Judges',
         'Swipe down the phone notification tray. Turn on Airplane Mode. Explicitly disable Wi-Fi and Mobile Data. '
         'Show the active airplane icon to the evaluators to prove zero connectivity.'),
        ('Step 2: Relaunch or Refresh TriNetra',
         'Relaunch the app from the home screen. Notice that no "No Internet" dinosaur appears; the app boots '
         'instantly in under 1 second from the local Service Worker cache.'),
        ('Step 3: Tap Display to Unlock Audio',
         'Tap anywhere on the glass. The device on-board Text-to-Speech engine announces:\n'
         '>> "TriNetra active. Scanning started." (Spoken locally via Web Speech API).'),
        ('Step 4: Live 3D Spatial Sonar Avoidance',
         'Hold a chair, bag, or hand 1 to 2 meters in front of the camera. The on-device TF.js model detects '
         'the object with sub-100ms latency, emitting stereo pings that pan left/right and scale pitch (440Hz -> 880Hz).'),
        ('Step 5: Target Finder (Seek Object)',
         'Two-Finger Swipe Right. App announces: "Target set to chair. Point camera to locate." '
         'Pan the phone across the room. When centered on a chair, hear the rapid 988 Hz acoustic beacon tone.'),
        ('Step 6: Light Detector Tone',
         'Two-Finger Swipe Down. Aim at a light fixture or window. Audio pitch rises continuously with brightness.'),
        ('Step 7: Hardware Flashlight & Telemetry',
         'Swipe Up to toggle camera LED torch. Swipe Down to hear: "Full audio mode. Running at 4 FPS. Path clear."'),
        ('Step 8: Emergency Kill-Switch',
         'Three-Finger Tap. Instantly halts all audio loops: "TriNetra emergency pause. Tap screen to resume."')
    ]

    for title, desc in steps:
        pdf.section_sub(title)
        pdf.set_font('Arial', '', 9)
        pdf.set_text_color(51, 65, 85)
        pdf.multi_cell(0, 4.2, desc)
        pdf.ln(1)

    # PAGE 2
    pdf.add_page()

    # 4. Feature Matrix Table
    pdf.chapter_title(4, 'Comprehensive Feature Matrix: Offline vs. Online')
    pdf.body_p('Clear breakdown of which subsystems operate locally versus those utilizing cloud GenAI:')

    # Table Header
    pdf.set_fill_color(226, 232, 240)
    pdf.set_font('Arial', 'B', 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(50, 7, ' Feature / Tool', 1, 0, 'L', True)
    pdf.cell(35, 7, ' Offline Status', 1, 0, 'C', True)
    pdf.cell(105, 7, ' Underlying Engine & Local Mechanism', 1, 1, 'L', True)

    matrix = [
        ('Obstacle Detection', '100% OFFLINE', 'TensorFlow.js + MobileNet-V2 on phone WebGL GPU.'),
        ('3D Binaural Sonar', '100% OFFLINE', 'Web Audio API PannerNode and oscillators on phone DSP.'),
        ('Looming Collision Alert', '100% OFFLINE', 'Bounding box area expansion rate: delta-area/delta-t > 15%/s.'),
        ('Target Finder (Seek)', '100% OFFLINE', 'Local COCO-SSD class filtering + acoustic directional beacon.'),
        ('Light Tone Detector', '100% OFFLINE', 'HTML5 canvas pixel luminance sampling to oscillator pitch.'),
        ('LED Flashlight (Torch)', '100% OFFLINE', 'MediaStreamTrack applyConstraints torch control.'),
        ('Tactile Gestures', '100% OFFLINE', 'Centroid multi-touch tracking + Web Vibration API haptics.'),
        ('Audio Mode Switching', '100% OFFLINE', 'Full, Voice-Only, Sonar-Only, Emergency-Only local state.'),
        ('Emergency Kill-Switch', '100% OFFLINE', 'Three-finger tap instant oscillator and inference cancel.'),
        ('Gemini Scene Narrator', 'CLOUD REQUIRED', 'Google Gemini 2.5 Flash for natural paragraph descriptions.'),
        ('Verbatim OCR Reader', 'CLOUD REQUIRED', 'High-res 1600px frame to Gemini Vision for document reading.'),
        ('Banknote Reader', 'CLOUD REQUIRED', 'Gemini Vision fine denomination and currency verification.')
    ]

    pdf.set_font('Arial', '', 8)
    for feat, status, mech in matrix:
        is_off = 'OFFLINE' in status
        pdf.set_text_color(15, 23, 42)
        pdf.cell(50, 6, f' {feat}', 1, 0, 'L')
        
        if is_off:
            pdf.set_fill_color(220, 252, 231)
            pdf.set_text_color(21, 128, 61)
            pdf.cell(35, 6, status, 1, 0, 'C', True)
        else:
            pdf.set_fill_color(254, 226, 226)
            pdf.set_text_color(185, 28, 28)
            pdf.cell(35, 6, status, 1, 0, 'C', True)
            
        pdf.set_text_color(51, 65, 85)
        pdf.cell(105, 6, f' {mech}', 1, 1, 'L')

    pdf.ln(4)

    # 5. Cloud Fallback Test
    pdf.chapter_title(5, 'Architectural Isolation Test (Cloud Fallback)')
    pdf.body_p(
        'An essential mark of engineering rigor is graceful degradation. In Airplane Mode, perform a '
        'Two-Finger Tap (Gemini Scene Description) or Two-Finger Double Tap (Banknote Reader).'
    )
    pdf.callout_box(
        'EVALUATOR OBSERVATION POINT',
        'The app attempts the API fetch, catches the offline state, and calmly speaks: '
        '"Scene description failed. Please check internet connection."\n'
        'Key Proof for Judges: The obstacle collision avoidance radar, audio sonar pings, and safety alerts '
        'continue running in the background without freezing, crashing, or stuttering.',
        37, 99, 235 # Blue
    )

    # 6. Presentation Pitch Script
    pdf.chapter_title(6, 'The 60-Second Evaluator Presentation Script')
    
    pdf.set_fill_color(15, 23, 42)
    pdf.rect(10, pdf.get_y(), 190, 65, 'F')
    
    script_y = pdf.get_y() + 3
    pdf.set_xy(14, script_y)
    pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(245, 158, 11)
    pdf.cell(0, 4, '[STEP 1: Hold up smartphone showing Airplane Mode active]', 0, 1)
    pdf.set_font('Arial', 'I', 8.5)
    pdf.set_text_color(241, 245, 249)
    pdf.multi_cell(182, 4.2, 
        '"Judges, imagine a visually impaired student entering an underground metro station, an elevator, or '
        'a rural road where cellular reception drops completely. If an assistive walking aid relies on cloud '
        'servers, the user is left completely stranded and blind. That is why TriNetra was engineered with an '
        'offline-first Edge AI architecture."'
    )
    
    pdf.ln(2)
    pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(245, 158, 11)
    pdf.cell(0, 4, '[STEP 2: Relaunch TriNetra and tap the screen to activate]', 0, 1)
    pdf.set_font('Arial', 'I', 8.5)
    pdf.set_text_color(241, 245, 249)
    pdf.multi_cell(182, 4.2, 
        '"Notice that my phone is in 100% Airplane Mode - zero Wi-Fi, zero mobile data. When I launch TriNetra, '
        'our Service Worker boots the entire app from local cache in less than one second. The camera stream, '
        'the TensorFlow.js neural network running on the phone GPU, our 3D binaural spatial sonar, and our tactile '
        'gesture surface are executing 100% on this smartphone."'
    )
    
    pdf.ln(2)
    pdf.set_font('Arial', 'B', 8)
    pdf.set_text_color(245, 158, 11)
    pdf.cell(0, 4, '[STEP 3: Walk toward a chair or hold a hand 1 meter in front of camera]', 0, 1)
    pdf.set_font('Arial', 'I', 8.5)
    pdf.set_text_color(241, 245, 249)
    pdf.multi_cell(182, 4.2, 
        '"As an obstacle enters the frame, the user hears sub-100 millisecond directional audio pings in their ears, '
        'warning them of collision hazards with zero server latency, complete privacy, and zero data cost. '
        'Their fundamental walking safety never depends on a cell tower."'
    )

    output_path = r'c:\Users\satis\OneDrive\Desktop\7th Sense\TriNetra_Offline_Mode_Demonstration_Guide.pdf'
    pdf.output(output_path, 'F')
    print(f'Successfully generated PDF at: {output_path}')

if __name__ == '__main__':
    build_pdf()
