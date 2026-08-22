#!/usr/bin/env python3
"""Build the illustrated VeloStatiq F1 prediction-system handbook."""
from pathlib import Path
import json, math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "VeloStatiq_F1_Prediction_System_Report.pdf"
SAMPLE = ROOT / "DataBase" / "PredictionSystem" / "sample_prediction.json"
W, H = A4
BG, PANEL, WHITE, MUTED = HexColor("#07090C"), HexColor("#11151A"), HexColor("#F4F6F8"), HexColor("#89939E")
RED, CYAN, AMBER, GREEN = HexColor("#FF2846"), HexColor("#48D8FF"), HexColor("#FFCB45"), HexColor("#4DF3A1")

def wrap(text, font, size, width):
    words, lines, current = text.split(), [], ""
    for word in words:
        test = f"{current} {word}".strip()
        if stringWidth(test, font, size) <= width: current = test
        else:
            if current: lines.append(current)
            current = word
    if current: lines.append(current)
    return lines

def page(c, number, title, kicker):
    c.setFillColor(BG); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(RED); c.rect(0, H-7, W, 7, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 8); c.setFillColor(RED); c.drawString(42, H-42, "VELOSTATIQ / FORMULA ONE INTELLIGENCE")
    c.setFont("Helvetica", 7); c.setFillColor(MUTED); c.drawRightString(W-42, H-42, f"TECHNICAL HANDBOOK  ·  {number:02d}")
    c.setFont("Helvetica-Bold", 23); c.setFillColor(WHITE); c.drawString(42, H-82, title)
    c.setFont("Helvetica", 8); c.setFillColor(CYAN); c.drawString(42, H-99, kicker.upper())
    c.setStrokeColor(Color(1,1,1,.1)); c.line(42, 36, W-42, 36)
    c.setFont("Helvetica", 6.5); c.setFillColor(MUTED); c.drawString(42, 23, "Generated from the implementation in /Users/optimusprime/Desktop/SummerProject")
    c.drawRightString(W-42, 23, "Forecasts are informational—not betting or race-engineering advice")

def para(c, text, x, y, width, size=9, color=MUTED, leading=14, font="Helvetica"):
    c.setFont(font,size); c.setFillColor(color)
    for line in wrap(text,font,size,width): c.drawString(x,y,line); y-=leading
    return y

def card(c, x, y, w, h, title, value="", accent=RED):
    c.setFillColor(PANEL); c.roundRect(x,y,w,h,10,fill=1,stroke=0)
    c.setFillColor(accent); c.rect(x,y+h-3,w,3,fill=1,stroke=0)
    c.setFont("Helvetica-Bold",7); c.setFillColor(MUTED); c.drawString(x+12,y+h-20,title.upper())
    if value: c.setFont("Helvetica-Bold",17); c.setFillColor(WHITE); c.drawString(x+12,y+15,value)

def section(c, title, x, y, width):
    c.setFillColor(RED); c.rect(x,y-2,18,2,fill=1,stroke=0)
    c.setFont("Helvetica-Bold",10); c.setFillColor(WHITE); c.drawString(x+25,y-5,title.upper())
    return y-25

def bullet(c, text, x, y, width, accent=RED):
    c.setFillColor(accent); c.circle(x+3,y+3,2.2,fill=1,stroke=0)
    return para(c,text,x+13,y,width-13,8.5,MUTED,13)

def arrow(c,x1,y,x2,color=CYAN):
    c.setStrokeColor(color); c.setLineWidth(1.4); c.line(x1,y,x2,y)
    c.setFillColor(color); c.line(x2,y,x2-6,y+4); c.line(x2,y,x2-6,y-4)

def title_page(c, sample):
    c.setFillColor(BG); c.rect(0,0,W,H,fill=1,stroke=0)
    for r,a in [(230,.04),(170,.06),(110,.1)]: c.setStrokeColor(Color(1,.1,.2,a)); c.setLineWidth(2); c.circle(W*.78,H*.68,r,fill=0,stroke=1)
    c.setFillColor(RED); c.rect(42,H-84,46,5,fill=1,stroke=0)
    c.setFont("Helvetica-Bold",9); c.setFillColor(RED); c.drawString(42,H-112,"VELOSTATIQ SPORTS OS / ENGINEERING REPORT")
    c.setFont("Helvetica-Bold",37); c.setFillColor(WHITE); c.drawString(42,H-183,"FORMULA ONE")
    c.drawString(42,H-226,"PREDICTION SYSTEM")
    c.setFont("Helvetica",13); c.setFillColor(MUTED); c.drawString(42,H-257,"How the Python model works, where it lives, and how to change it")
    c.setFillColor(PANEL); c.roundRect(42,H-430,W-84,120,15,fill=1,stroke=0)
    c.setFont("Helvetica-Bold",8); c.setFillColor(CYAN); c.drawString(60,H-335,"WORKED MODEL OUTPUT")
    vals=[("FASTEST LAP",sample.get("predictedLap","—")),("FASTEST-LAP CHANCE",f"{sample.get('fastestLapProbability',0)*100:.1f}%"),("PIT WINDOW",f"L{sample.get('pitWindow',{}).get('start','—')}–{sample.get('pitWindow',{}).get('end','—')}"),("CONFIDENCE",f"{sample.get('confidence',0)*100:.0f}%")]
    for i,(k,v) in enumerate(vals):
        x=60+i*120; c.setFont("Helvetica",6); c.setFillColor(MUTED); c.drawString(x,H-365,k); c.setFont("Helvetica-Bold",14); c.setFillColor(WHITE); c.drawString(x,H-388,v)
    c.setFont("Helvetica-Bold",9); c.setFillColor(WHITE); c.drawString(42,87,"VERSION 1.1  ·  22 AUGUST 2026")
    c.setFont("Helvetica",7); c.setFillColor(MUTED); c.drawString(42,69,"Python 3 standard library · live last-five form · auditable CSV evidence")
    c.setFillColor(RED); c.rect(0,0,W,8,fill=1,stroke=0); c.showPage()

def architecture(c):
    page(c,2,"System architecture","one engine, explicit boundaries")
    y=H-140
    para(c,"The interface never calculates a Formula One forecast in JavaScript. It asks the server to execute the Python model, parses its JSON response, and renders the result only inside the Prediction tab.",42,y,W-84,10,WHITE,15)
    y=H-250; boxes=[("SCENARIO UI","driver · race · weather"),("NEXT.JS ROUTE","validated query inputs"),("PYTHON ENGINE","historical model"),("JSON OUTPUT","charts · strategy")]
    bw=112
    for i,(a,b) in enumerate(boxes):
        x=42+i*128; card(c,x,y,bw,82,a,accent=[CYAN,CYAN,RED,GREEN][i]); c.setFont("Helvetica",6.5); c.setFillColor(MUTED); c.drawString(x+12,y+29,b)
        if i<3: arrow(c,x+bw+4,y+41,x+124)
    y=section(c,"Separation of concerns",42,H-390,W-84)
    for text,color in [("Recorded facts: Jolpica results, standings, pit stops and lap timing feed Latest Race and Race Analysis.",CYAN),("Forecast evidence: local CSV history feeds only f1_predictor.py.",RED),("Presentation: React, Recharts, Framer Motion and React Three Fiber visualize outputs without altering them.",GREEN)]: y=bullet(c,text,42,y,W-84,color)-8
    y=section(c,"Request path",42,y-5,W-84)
    para(c,"GET /api/f1-predict?driver=VER&driverId=max_verstappen&race=Abu%20Dhabi&trackTemp=34&rain=10&fuel=45",42,y,W-84,7.2,CYAN,13,"Courier")
    c.showPage()

def file_map(c):
    page(c,3,"File map","where everything is")
    y=H-140
    rows=[("MODEL","DataBase/PredictionSystem/f1_predictor.py","Owns every forecast calculation."),("EXAMPLE","DataBase/PredictionSystem/sample_prediction.json","A reproducible output for learning and testing."),("SERVER BRIDGE","src/lib/f1PythonPrediction.ts","Safely executes Python without a shell."),("PREDICTION API","src/app/api/f1-predict/route.ts","Adds live recent form and returns Python JSON."),("LAST-FIVE API","src/app/api/f1-history/route.ts","Returns two drivers' newest completed races."),("HISTORY SERVICE","src/lib/f1DriverHistory.ts","Normalizes results, metrics, cache and fallbacks."),("COMPARISON UI","src/components/F1LastFiveComparison.tsx","Charts 5 + 5 results and explains inputs."),("3D REPLAY","src/components/CircuitReplay3D.tsx","Animates recorded lap-duration pace."),("THIS REPORT","output/pdf/VeloStatiq_F1_Prediction_System_Report.pdf","The document you are reading.")]
    for tag,path,desc in rows:
        c.setFillColor(PANEL); c.roundRect(42,y-48,W-84,42,7,fill=1,stroke=0)
        c.setFont("Helvetica-Bold",6); c.setFillColor(RED); c.drawString(53,y-23,tag)
        c.setFont("Courier-Bold",7.2); c.setFillColor(WHITE); c.drawString(120,y-22,path)
        c.setFont("Helvetica",6.5); c.setFillColor(MUTED); c.drawString(120,y-36,desc); y-=54
    c.showPage()

def data_page(c):
    page(c,4,"Evidence and feature engineering","the rows behind the forecast")
    y=H-137
    datasets=[("driver_race_summary.csv","best lap, pace consistency, best finish, sample depth"),("pit_strategy.csv","driver/team pit-lap history and service evidence"),("pit_stops.csv","observed stop durations used for service-time baseline"),("compound_performance.csv","soft/medium/hard pace and average tyre life"),("stint_analysis.csv","stint lengths and compound sequencing"),("drivers.csv","driver code, identity, nationality and number")]
    for i,(name,use) in enumerate(datasets):
        x=42+(i%2)*256; yy=y-(i//2)*90; card(c,x,yy-65,240,72,name,accent=[RED,CYAN,AMBER,GREEN,RED,CYAN][i]); para(c,use,x+12,yy-31,216,7.2,MUTED,10)
    y=H-455; y=section(c,"Runtime preparation",42,y,W-84)
    steps=["Parse CSV with Python's csv.DictReader; malformed or empty numeric values are ignored.","Filter evidence by selected driver and circuit; fall back to broader driver history when sparse.","Compute robust centers (medians/means), consistency and sample-depth signals.","Apply scenario penalties only after the historical baseline has been established."]
    for i,text in enumerate(steps):
        c.setFillColor([RED,CYAN,AMBER,GREEN][i]); c.circle(55,y+4,9,fill=1,stroke=0); c.setFillColor(BG); c.setFont("Helvetica-Bold",7); c.drawCentredString(55,y+1,str(i+1)); y=para(c,text,75,y,W-117,8.5,WHITE,13)-12
    y=section(c,"Provenance rule",42,y,W-84); para(c,"Jolpica's five newest results become explicit model features: average finish, points per race, DNF rate and sample count. They stay separate from the local pace archive and never become claimed future facts.",42,y,W-84,8.5,MUTED,13)
    c.showPage()

def model_page(c):
    page(c,5,"Model mathematics","transparent by design")
    y=H-145
    card(c,42,y-80,W-84,88,"PACE ESTIMATE",accent=RED)
    c.setFont("Courier-Bold",10); c.setFillColor(WHITE); c.drawString(60,y-43,"lap = 0.68 × driver_best + 0.32 × circuit_benchmark")
    c.setFont("Courier",8); c.setFillColor(CYAN); c.drawString(60,y-62,"      + consistency_adjustment + temperature + rain + fuel")
    y=section(c,"Probability calibration",42,H-285,W-84)
    para(c,"Fastest-lap probability uses historical pace plus normalized recent finish, points and reliability. A sigmoid converts the score to a bounded 0-1 probability; missing driver archive rows lower confidence.",42,y,W-84,9,MUTED,14)
    c.setFont("Courier-Bold",11); c.setFillColor(WHITE); c.drawString(95,y-68,"p = 1 / (1 + exp(−score))")
    # sigmoid plot
    ox,oy,pw,ph=315,y-95,210,95; c.setStrokeColor(Color(1,1,1,.15)); c.line(ox,oy,ox+pw,oy); c.line(ox+pw/2,oy,ox+pw/2,oy+ph)
    c.setStrokeColor(CYAN); c.setLineWidth(2); path=c.beginPath()
    for i in range(81):
        xx=ox+i/80*pw; z=-6+i/80*12; yy=oy+(1/(1+math.exp(-z)))*ph
        (path.moveTo if i==0 else path.lineTo)(xx,yy)
    c.drawPath(path,stroke=1,fill=0)
    y=section(c,"Strategy outputs",42,H-475,W-84)
    items=[("PIT WINDOW","Median historic pit lap, shifted by rain/safety-car scenario and clamped to a credible race range."),("EXPECTED STOPS","Historical stop count plus scenario pressure; high rain can add a tyre transition."),("TYRE PLAN","Compound performance and average stint life allocate sequential stints across the race."),("PIT DURATION","Median observed service time for the selected evidence, with bounded fallback."),("CONFIDENCE","Blend of driver and pit sample coverage, reduced for extrapolation and volatility.")]
    for i,(name,desc) in enumerate(items):
        c.setFont("Helvetica-Bold",7); c.setFillColor([RED,CYAN,AMBER,GREEN,RED][i]); c.drawString(42,y,name); y=para(c,desc,135,y,W-177,8,MUTED,12)-10
    c.showPage()

def worked(c,s):
    page(c,6,"Worked example","ver · abu dhabi · dry-biased scenario")
    y=H-142
    vals=[("PREDICTED LAP",s.get("predictedLap","—"),RED),("FASTEST-LAP CHANCE",f"{s.get('fastestLapProbability',0)*100:.1f}%",CYAN),("PIT SERVICE",f"{s.get('predictedPitDuration',0):.2f}s",AMBER),("CONFIDENCE",f"{s.get('confidence',0)*100:.0f}%",GREEN)]
    for i,(a,b,color) in enumerate(vals): card(c,42+i*128,y-75,115,78,a,b,color)
    y=section(c,"Scenario",42,H-265,W-84)
    scenario=s.get("scenario",{}); para(c,f"Track temperature {scenario.get('trackTemp',34)}°C  ·  rain {scenario.get('rain',10)}%  ·  fuel {scenario.get('fuel',45)} kg  ·  safety car {'on' if scenario.get('safetyCar') else 'off'}",42,y,W-84,9,WHITE,14)
    y=section(c,"Tyre timeline",42,y-38,W-84)
    plan=s.get("tyrePlan",[]); total=max(1,sum(p.get("length",0) for p in plan)); x=42
    for i,p in enumerate(plan):
        width=(W-84)*p.get("length",0)/total; color=[RED,AMBER,WHITE][i%3]; c.setFillColor(color); c.roundRect(x,y-35,width-3,25,6,fill=1,stroke=0); c.setFillColor(BG); c.setFont("Helvetica-Bold",7); c.drawCentredString(x+(width-3)/2,y-26,f"{p.get('compound')} · {p.get('length')} laps"); x+=width
    pit=s.get("pitWindow",{}); y=section(c,"Interpretation",42,y-85,W-84)
    notes=[f"The modeled pit window opens on lap {pit.get('start','—')} and closes on lap {pit.get('end','—')}.",f"The engine recommends {s.get('expectedStops','—')} stop(s); this changes when scenario controls imply transition tyres or safety-car timing.","Re-running the same command with the same CSV files and inputs produces the same output.","This output is a baseline estimate—not knowledge of future team strategy, incidents, upgrades or weather."]
    for text,color in zip(notes,[RED,CYAN,AMBER,GREEN]): y=bullet(c,text,42,y,W-84,color)-9
    c.showPage()

def usage(c):
    page(c,7,"Run, modify and test","a practical operator guide")
    y=H-140
    commands=[("RUN PYTHON", "python3 DataBase/PredictionSystem/f1_predictor.py --driver VER --race 'Abu Dhabi' --recent-races 5 --recent-finish 3.2 --recent-points 15 --recent-dnf-rate 0"),("SAVE JSON","add: --output DataBase/PredictionSystem/sample_prediction.json"),("CALL THE API","curl 'http://localhost:3000/api/f1-predict?driver=VER&driverId=max_verstappen&race=Abu%20Dhabi'"),("VERIFY APP","npm run lint  ·  npx tsc --noEmit  ·  npm run build")]
    for label,cmd in commands:
        c.setFont("Helvetica-Bold",7); c.setFillColor(RED); c.drawString(42,y,label); c.setFillColor(PANEL); c.roundRect(42,y-53,W-84,39,7,fill=1,stroke=0); para(c,cmd,54,y-31,W-108,7,CYAN,10,"Courier"); y-=78
    y=section(c,"Safely tune the model",42,y,W-84)
    tune=["Edit weights and scenario coefficients in f1_predictor.py; change one family of coefficients at a time.","Keep a fixed validation set of historical races and compare absolute lap error, pit-window error and probability calibration.","Never train and evaluate on the same race rows. Prefer time-ordered validation to avoid future-data leakage.","Regenerate sample_prediction.json and this report after a material model change."]
    for text in tune:y=bullet(c,text,42,y,W-84)-8
    c.showPage()

def limits(c):
    page(c,8,"Limits, sources and next steps","what the system does not claim")
    y=H-140
    y=section(c,"Known limits",42,y,W-84)
    limits=["Historical CSV coverage may not represent the current car, regulation package or tyre construction.","A current driver without local rows uses a same-circuit field median; driverSamples is 0 and confidence is reduced.","Lap times from different circuits are never averaged as recent-form evidence because circuit lengths differ.","Pit duration feeds can include anomalous long stops; the model uses bounded robust statistics.","Probability is calibration, not certainty. Outcomes depend on weather, traffic, incidents and team decisions."]
    for text in limits:y=bullet(c,text,42,y,W-84,AMBER)-7
    y=section(c,"Primary references",42,y-4,W-84)
    refs=[("Jolpica F1 API documentation","https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md"),("Jolpica race endpoints","https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/races.md"),("OpenF1 API and telemetry concepts","https://openf1.org/"),("Python standard library","https://docs.python.org/3/library/")]
    for name,url in refs:
        c.setFont("Helvetica-Bold",8); c.setFillColor(WHITE); c.drawString(42,y,name); c.setFont("Helvetica",5.2); c.setFillColor(CYAN); c.drawString(195,y,url); y-=25
    y=section(c,"Recommended next iteration",42,y-4,W-84)
    para(c,"Backtest each season with time-ordered folds, record calibration curves, add circuit geometry from a licensed coordinate source, and version every trained parameter set. Keep the current transparent baseline as the benchmark that more complex models must beat.",42,y,W-84,8.5,MUTED,13)
    c.showPage()

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    sample=json.loads(SAMPLE.read_text()) if SAMPLE.exists() else {}
    c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
    c.setTitle("VeloStatiq Formula One Prediction System Report"); c.setAuthor("VeloStatiq Sports OS")
    title_page(c,sample); architecture(c); file_map(c); data_page(c); model_page(c); worked(c,sample); usage(c); limits(c); c.save()
    print(OUT)

if __name__=="__main__": main()
