import cv2
import numpy as np
import pandas as pd

from midiutil import MIDIFile
from midi2audio import FluidSynth


BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
DARK_RED_BGR = (0, 0, 150)
LIGHT_BLUE_BGR = (240, 171, 0)
ROI_HEIGHT = 50
ROI_Y = 0.4


def resize_video(input_path, scale_perc, output_path, fps = None):
    """Resize video based on a scale factor.

    Keyword arguments:
    input_path -- Input video path
    scale_perc -- Scale factor (percent)
    output_path -- Output file path
    fps -- Number of Frames Per Second. Defaut is None, FPS of the input video will be used
    """  

    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    scale_percent = 50 # percent of original size
    
    ret, frame = cap.read()
    width = int(frame.shape[1] * scale_percent / 100)
    height = int(frame.shape[0] * scale_percent / 100)
    dim = (width, height)
    
    
    if(fps is None):
        fps = cap.get(cv2.CAP_PROP_FPS)
        print(fps)
    
    out = cv2.VideoWriter(output_path, fourcc, fps, dim)
    
    while True:
        ret, frame = cap.read()
        if ret == True:
            b = cv2.resize(frame, dim,fx = 0, fy = 0, interpolation = cv2.INTER_CUBIC)
            out.write(b)
        else:
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    return None


def detect_skiers(input_path, output_path = None):
    """Resize video based on a scale factor.

    Keyword arguments:
    input_path -- Input video path
    output_path -- Output file path
    """
    
    output_values = [0, 0]
    cap = cv2.VideoCapture(input_path)
    
    object_detector = cv2.createBackgroundSubtractorMOG2()
    
    tracker = cv2.MultiTracker_create()
    trackerType = "CSRT"
    
    
    frame_width = int(cap.get(3))
    frame_height = int(cap.get(4))

    if output_path is not None:
        output_video = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), 30, (frame_width,frame_height))
    
    while True:
        ret, frame = cap.read()
        if ret == False:
            break
        
        width = frame.shape[1]
        height = frame.shape[0]
    
        ln = int(ROI_Y * height)
        ln_lw = ln + ROI_HEIGHT
        ln_up = ln - ROI_HEIGHT
        
        roi = frame[ln_up:ln_lw, :]

        mask = object_detector.apply(roi)
        _, mask = cv2.threshold(mask, 254, 255, cv2.THRESH_BINARY)
        
        cv2.imshow("Mask", mask)
        
        contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
        cv2.line(frame, (0, ln), (width, ln), WHITE, 7, cv2.LINE_4)
        cv2.line(frame, (0, ln_lw), (width, ln_lw), WHITE, 1, cv2.LINE_4)
        cv2.line(frame, (0, ln_up), (width, ln_up), WHITE, 1, cv2.LINE_4)
       
        for cnt in contours:
            # Calculate area and remove small elements
            area = cv2.contourArea(cnt)
            if area > 5:
                
                M = cv2.moments(cnt)
                cx = int(M['m10'] / M['m00'])
                cy = int(M['m01'] / M['m00'])
                cv2.drawContours(roi, [cnt], -1, LIGHT_BLUE_BGR, -1)
                
                if cy == ROI_HEIGHT:
                    out = [cap.get(cv2.CAP_PROP_POS_MSEC), cx]
                    output_values = np.vstack([output_values, out])

                if cy > ROI_HEIGHT:
                    cv2.circle(roi, (cx, cy), int((100-cy)/3), DARK_RED_BGR, -1)

        cv2.imshow("Frame", frame)
        
        if output_path is not None:
            output_video.write(frame)
        
        key = cv2.waitKey(1)
        if key == 27:
            break
    
    cap.release()

    if output_path is not None:
        output_video.release()
    
    cv2.destroyAllWindows()
    
    return output_values


def generate_midi(video_features, output_path):
    """Sonification

    Keyword arguments:
    output_values -- 
    output_path -- 
    """
    
    df = pd.DataFrame(video_features, columns = ['time','x_coord'])
    df["bin"] = pd.cut(df["x_coord"], 24, labels=False)
    
    degrees  = np.arange(60, 60 + 24) # MIDI note, 2-octave chromatic scale
    track    = 0
    channel  = 1
    time     = 0   # beats
    duration = 4   # beats
    tempo    = 60  # beats per minute
    volume   = 100 # 0-127, MIDI standard
    
    midi_output = MIDIFile(1) # One track, defaults to format 1
    midi_output.addTempo(track, time, tempo)
    
    df["degrees"] = degrees[df["bin"]]
    df["time_s"] = df["time"] / 1000
    
    for index, row in df.iterrows():
        midi_output.addNote(
            track,
            channel,
            int(row["degrees"]),
            (row["time_s"]),
            duration,
            volume
        )
    
    with open(output_path, "wb") as output_file:
        midi_output.writeFile(output_file)
    
    return None


def midi_to_wav(midi_path, output_path, soundfont_path):
    """MIDI to WAV conversion.

    Keyword arguments:
    midi_path -- 
    output_path -- 
    soundfont_path --
    """
    fs = FluidSynth(soundfont_path)
    fs.midi_to_audio(midi_path, output_path)
    return None
