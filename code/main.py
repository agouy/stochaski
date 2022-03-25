## main.py


output_values = [0, 0]
cap = cv2.VideoCapture("./input_files/input_video_resized.avi")

# Object detection from Stable camera
object_detector = cv2.createBackgroundSubtractorMOG2()

region_height = 50

# We convert the resolutions from float to integer.
frame_width = int(cap.get(3))
frame_height = int(cap.get(4))
# Define the codec and create VideoWriter object.The output is stored in 'outpy.avi' file.
output_video = cv2.VideoWriter('./tmp/output_video.avi',cv2.VideoWriter_fourcc('M','J','P','G'), 30, (frame_width,frame_height))

while True:
    ret, frame = cap.read()
    if ret == False:
        break
    
    width = frame.shape[1]
    height = frame.shape[0]

    ln = int(height/2)
    roi = frame[(ln-region_height):(ln+region_height), :]
    #roi = frame[ln:(ln-1), :]
 
    # 1. Object Detection
    mask = object_detector.apply(roi)
    _, mask = cv2.threshold(mask, 254, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    cv2.line(frame,(0,ln),(width,ln),(255,255,255), 7, cv2.LINE_4)
    cv2.line(frame,(0,ln+region_height),(width,ln+region_height),(255,255,255), 2, cv2.LINE_4)
    cv2.line(frame,(0,ln-region_height),(width,ln-region_height),(255,255,255), 2, cv2.LINE_4)
   
    for cnt in contours:
        # Calculate area and remove small elements
        area = cv2.contourArea(cnt)
        if area > 10:
            
            M = cv2.moments(cnt)
            cx = int(M['m10'] / M['m00'])
            cy = int(M['m01'] / M['m00'])
            cv2.drawContours(roi, [cnt], -1, (240, 171, 0), -1)
            
            if cy == region_height:
                
                out = [cap.get(cv2.CAP_PROP_POS_MSEC), cx]
                output_values = np.vstack([output_values, out])
                cv2.putText(frame, "Saluuut", (cx, ln), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    cv2.imshow("Frame", frame)
    output_video.write(frame)
    
    key = cv2.waitKey(1)
    if key == 27:
        break

cap.release()
output_video.release()
cv2.destroyAllWindows()

## Postprocessing


df = pd.DataFrame(output_values, columns = ['time','x_coord'])
#print(df)
df["bin"] = pd.cut(df["x_coord"], 24, labels=False)

degrees  = np.arange(60, 60 + 24) # MIDI note number
track    = 0
channel  = 1
time     = 0   # In beats
duration = 4   # In beats
tempo    = 60  # In BPM
volume   = 100 # 0-127, as per the MIDI standard

midi_output = MIDIFile(1) # One track, defaults to format 1 (tempo track
                     # automatically created)
midi_output.addTempo(track,time, tempo)

df["degrees"] = degrees[df["bin"]]
df["time_s"] = df["time"] / 1000

for index, row in df.iterrows():
    midi_output.addNote(track, channel, int(row["degrees"]), (row["time_s"]), duration, volume)

with open("./tmp/midi_output.mid", "wb") as output_file:
    midi_output.writeFile(output_file)



fs = FluidSynth('Celeste.sf2')
#fs.play_midi('./tmp/midi_output.mid')

fs.midi_to_audio('./tmp/midi_output.mid', './tmp/wave_output.wav')

## note
