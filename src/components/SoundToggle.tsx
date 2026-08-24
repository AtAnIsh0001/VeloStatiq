export default function SoundToggle() {
  const script = `(function(){var last=0,context=null;function enabled(){return localStorage.getItem('velostatiq-sound')==='on'}function toggleButton(){return document.getElementById('velostatiq-sound')}function paint(){var on=enabled(),b=toggleButton();if(!b)return;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Turn VeloStatiq sound off':'Turn VeloStatiq sound on');var strong=b.querySelector('strong');if(strong)strong.textContent=on?'Sound on':'Sound off';var small=b.querySelector('small');if(small)small.textContent=on?'UI audio enabled':'Click to enable'}function engineRev(ctx,now,intensity){var duration=intensity===2?.9:intensity===1?.42:.16,idle=74,top=intensity===2?520:intensity===1?390:250,master=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=7;filter.frequency.setValueAtTime(240,now);filter.frequency.exponentialRampToValueAtTime(2800,now+duration*.7);filter.frequency.exponentialRampToValueAtTime(600,now+duration);[1,1.5,3.01].forEach(function(multiplier,index){var oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sawtooth';oscillator.frequency.setValueAtTime(idle*multiplier,now);oscillator.frequency.exponentialRampToValueAtTime(top*multiplier,now+duration*.75);oscillator.frequency.exponentialRampToValueAtTime(idle*(intensity===2?2.2:1.15)*multiplier,now+duration);gain.gain.value=index===0?.55:.22;oscillator.connect(gain).connect(filter);oscillator.start(now);oscillator.stop(now+duration)});var samples=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,samples,ctx.sampleRate),channel=buffer.getChannelData(0),noiseIndex;for(noiseIndex=0;noiseIndex<samples;noiseIndex++)channel[noiseIndex]=(Math.random()*2-1)*(1-noiseIndex/samples);var noise=ctx.createBufferSource(),noiseGain=ctx.createGain();noise.buffer=buffer;noiseGain.gain.value=.04;noise.connect(noiseGain).connect(filter);noise.start(now);master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(intensity===0?.06:.12,now+.03);master.gain.exponentialRampToValueAtTime(.0001,now+duration);filter.connect(master).connect(ctx.destination)}function play(kind){if(!enabled())return;try{context=context||new AudioContext()}catch(e){return}if(context.state!=='running'){try{void context.resume()}catch(e){}return}var now=context.currentTime;if(location.pathname.indexOf('formula-one')!==-1){engineRev(context,now,kind==='activate'?2:kind==='navigate'?1:0);return}var base=location.pathname.indexOf('football')!==-1?260:360,notes=kind==='activate'?[base,base*1.25,base*1.5]:[kind==='hover'?base*.75:base];notes.forEach(function(frequency,index){var oscillator=context.createOscillator(),gain=context.createGain(),start=now+index*.055;oscillator.type=kind==='hover'?'sine':'triangle';oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==='activate'?.09:.035,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+(kind==='activate'?.22:.09));oscillator.connect(gain).connect(context.destination);oscillator.start(start);oscillator.stop(start+(kind==='activate'?.24:.11))})}document.addEventListener('click',function(event){if(!event.target||!event.target.closest)return;var toggle=event.target.closest('#velostatiq-sound');if(toggle){localStorage.setItem('velostatiq-sound',enabled()?'off':'on');paint();play('activate');return}if(!enabled())return;if(event.target.closest('a,button,[role=button]'))play('navigate')},true);document.addEventListener('pointerover',function(event){if(!enabled()||!event.target.closest('.sport-choice,nav button,.news-card,.cinema-fixture-grid>button,.f1-driver-grid>button'))return;var now=performance.now();if(now-last>140){last=now;play('hover')}},true);document.addEventListener('pointerdown',function(){if(context&&context.state==='suspended')try{void context.resume()}catch(e){}},true);paint()})();`;
  return (
    <>
      <button
        id="velostatiq-sound"
        className="sound-toggle"
        type="button"
        aria-label="Turn VeloStatiq sound on"
        aria-pressed="false"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15 9.5a4 4 0 0 1 0 5" />
        </svg>
        <span>
          <strong>Sound off</strong>
          <small>Click to enable</small>
        </span>
      </button>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
