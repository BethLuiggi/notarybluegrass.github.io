var SK='pk_live_51TBehPDMcmmj7Vo6WQPtdmOnZuN5QvocG43prYtIfwDZCaQpE62zPiimR9no6ssHqRYQaGMM8IC3VgWutc3TBVf300tg0SPlY0';
var PROMO='TITLEME';
var HOLIDAYS=['2025-01-01','2025-01-20','2025-02-17','2025-05-26','2025-06-19','2025-07-04','2025-09-01','2025-10-13','2025-11-11','2025-11-27','2025-12-25','2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-04','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25'];
var CAL={beth:'https://calendly.com/beth-notarybluegrass/signing',luiggi:'https://calendly.com/luiggi-notarybluegrass/signing'};
var stripe,cardEl;
var TOTAL_STEPS=8;
var curStep=1;

// Booking state
var bk={
  agent:'',notaryPrints:null,pkgFee:0,pkgLabel:'',extraFee:0,
  signers:2,sigFee:0,witFee:0,ahFee:0,milesFee:0,miles:0,
  prefDate:'',prefTime:'',timeDisplay:'',
  isTitleCo:false,needsLocation:false,milesCalc:false
};

var PKGS_NOTARY=[
  {fee:50,label:'1-5 pages',extra:false},
  {fee:80,label:'6-25 pages',extra:false},
  {fee:120,label:'26-100 pages',extra:false},
  {fee:140,label:'101-130 pages',extra:false},
  {fee:150,label:'131-150 pages',extra:false},
  {fee:200,label:'Reverse Mortgage',extra:false},
  {fee:150,label:'151 pages and more',extra:true,sub:'$150 base + $0.50 per page over 150'}
];
var PKGS_CUSTOMER=[
  {fee:40,label:'1-5 pages',extra:false},
  {fee:70,label:'6-25 pages',extra:false},
  {fee:110,label:'26-100 pages',extra:false},
  {fee:130,label:'101-130 pages',extra:false},
  {fee:140,label:'131-150 pages',extra:false},
  {fee:190,label:'Reverse Mortgage',extra:false},
  {fee:140,label:'151 pages and more',extra:true,sub:'$140 base + $0.50 per page over 150'}
];

// ---- Helpers ----
function $(id){return document.getElementById(id);}

function goStep(n){
  if(n===6)buildInvoice('s6invoice');
  if(n===7){buildInvoice('s7invoice');loadStripe();}
  if(n===8){
    var pt=$('calPrefTime'); if(pt)pt.textContent=bk.timeDisplay||'your preferred time';
    loadCal();
  }
  curStep=(n==='success'?TOTAL_STEPS:n);
  document.querySelectorAll('.step').forEach(function(s){s.classList.remove('active');});
  var el=(n==='success')?$('sSuccess'):$('s'+n);
  if(el)el.classList.add('active');
  $('bModal').scrollTop=0;
  updateProg();
}

function updateProg(){
  var p=$('bProg'); p.innerHTML='';
  for(var i=1;i<=TOTAL_STEPS;i++){
    var d=document.createElement('div');
    d.className='pd'+(i<=curStep?' done':'');
    p.appendChild(d);
  }
}

function calcTotal(){
  return bk.pkgFee+(bk.extraFee||0)+bk.witFee+bk.sigFee+(bk.milesFee||0)+bk.ahFee;
}

function buildInvoice(id){
  var lines=[['Package — '+bk.pkgLabel+(bk.notaryPrints?' (Notary prints)':' (Customer prints)'),'$'+bk.pkgFee]];
  if(bk.extraFee>0)lines.push(['Extra pages over 150 (x $0.50/pg)','+$'+bk.extraFee.toFixed(2)]);
  if(bk.sigFee>0)lines.push([bk.signers+' signers (×$25 each over 2)','+$'+bk.sigFee]);
  if(bk.witFee>0)lines.push(['Witness fee','+$50']);
  if(bk.milesFee>0)lines.push(['Travel fee ('+bk.miles+' mi)','+$'+bk.milesFee]);
  if(bk.ahFee>0)lines.push(['After-hours/Sunday/Holiday fee','+$35']);
  var h='<div class="invoice"><div class="inv-header"><div class="inv-logo"><strong style="font-family:Playfair Display,serif;font-size:1.1rem;">Bluegrass Notary LLC</strong></div>';
  h+='<div class="inv-title"><strong>INVOICE</strong><br/>'+bk.timeDisplay+'<br/>Agent: '+(bk.agent==='beth'?'Beth':'Luiggi')+'</div></div>';
  lines.forEach(function(l){h+='<div class="inv-row"><span>'+l[0]+'</span><span>'+l[1]+'</span></div>';});
  h+='<div class="inv-total"><span>Total Due</span><span>$'+calcTotal()+'</span></div>';
  h+='<div style="margin-top:.75rem;font-size:.78rem;color:var(--gray);border-top:1px solid var(--lg);padding-top:.75rem;">';
  h+='<strong>Location:</strong> '+($('sigAddr')?$('sigAddr').value:'')+(bk.sigCounty?', '+bk.sigCounty:'');
  if(bk.needsLocation)h+='<br/><span style="color:#856404;">&#9888; Customer noted no quiet meeting location.</span>';
  h+='</div></div>';
  $(id).innerHTML=h;
}

// ---- Open / Close ----
function openBooking(agent){
  bk={agent:agent,notaryPrints:null,pkgFee:0,pkgLabel:'',extraFee:0,signers:2,sigFee:0,witFee:0,ahFee:0,milesFee:0,miles:0,prefDate:'',prefTime:'',timeDisplay:'',isTitleCo:false,needsLocation:false,milesCalc:false};
  $('bAgentLabel').textContent='with '+(agent==='beth'?'Beth':'Luiggi');
  $('bOverlay').classList.add('active');
  document.body.style.overflow='hidden';
  // Reset step 1
  $('ro-notary-prints').classList.remove('sel'); $('ro-notary-prints').querySelector('.ro-dot').style.background=''; $('ro-notary-prints').querySelector('.ro-dot').style.borderColor='#ddd';
  $('ro-customer-prints').classList.remove('sel'); $('ro-customer-prints').querySelector('.ro-dot').style.background=''; $('ro-customer-prints').querySelector('.ro-dot').style.borderColor='#ddd';
  // Reset step 4
  $('prefDate').value=''; $('prefTime').value=''; $('ahAlert').style.display='none'; $('s4display').style.display='none';
  // Reset step 5
  $('custName').value=''; $('custEmail').value=''; $('custPhone').value='';
  $('needsWitness').checked=false; $('co-witness').classList.remove('sel');
  $('needsTable').checked=false; $('co-table').classList.remove('sel');
  $('ro-quiet-yes').classList.remove('sel'); $('ro-quiet-yes').querySelector('.ro-dot').style.background=''; $('ro-quiet-yes').querySelector('.ro-dot').style.borderColor='#ddd';
  $('ro-quiet-no').classList.remove('sel'); $('ro-quiet-no').querySelector('.ro-dot').style.background=''; $('ro-quiet-no').querySelector('.ro-dot').style.borderColor='#ddd';
  $('sigAddr').value=''; $('sigCounty').value=''; $('mileageResult').innerHTML='';
  document.querySelectorAll('.signer-btn').forEach(function(b){b.classList.remove('sel');});
  document.querySelector('.signer-btn[data-n="2"]').classList.add('sel');
  // Reset step 6
  $('agreeBox').checked=false; var s6n=$('s6next'); s6n.disabled=true; s6n.style.opacity='.5'; s6n.style.cursor='not-allowed';
  // Reset step 7
  $('promoMsg').textContent=''; $('promoCode').value=''; $('promoField').style.display='none'; $('cardSection').style.display='block';
  $('payBtn').textContent='Pay & Schedule Appointment →';
  goStep(1);
}

function closeBooking(){$('bOverlay').classList.remove('active');document.body.style.overflow='';}
$('bClose').addEventListener('click',function(e){e.stopPropagation();closeBooking();});
document.getElementById('bookBeth').addEventListener('click',function(){openBooking('beth');});
document.getElementById('bookLuiggi').addEventListener('click',function(){openBooking('luiggi');});

// ---- STEP 1 ----
function selectRo(selectedId, otherId, value){
  var sel=$(selectedId), oth=$(otherId);
  sel.classList.add('sel'); sel.querySelector('.ro-dot').style.background='var(--gold)'; sel.querySelector('.ro-dot').style.borderColor='var(--gold)';
  oth.classList.remove('sel'); oth.querySelector('.ro-dot').style.background=''; oth.querySelector('.ro-dot').style.borderColor='#ddd';
  return value;
}

$('s1options').addEventListener('click',function(e){
  var target=e.target;
  while(target && target!=$('s1options')){
    if(target.id==='ro-notary-prints'||target.id==='ro-customer-prints'){
      if(target.id==='ro-notary-prints') bk.notaryPrints=selectRo('ro-notary-prints','ro-customer-prints',true);
      else bk.notaryPrints=selectRo('ro-customer-prints','ro-notary-prints',false);
      return;
    }
    target=target.parentNode;
  }
});

$('s1next').addEventListener('click',function(){
  if(bk.notaryPrints===null){alert('Please choose who will be printing the package.');return;}
  buildPkgOptions();
  goStep(2);
});

// ---- STEP 2 ----
function buildPkgOptions(){
  var pkgs=bk.notaryPrints?PKGS_NOTARY:PKGS_CUSTOMER;
  $('s2label').textContent=bk.notaryPrints?'Select package size (notary prints)':'Select package size (you provide prints — $10 less)';
  bk.pkgFee=0; bk.pkgLabel=''; bk.extraFee=0;
  $('s2extra').style.display='none'; $('extraPages').value=''; $('extraResult').textContent='';
  var html='';
  pkgs.forEach(function(p,i){
    var price=p.extra?'$0.50/pg':('$'+p.fee);
    html+='<div class="ro s2opt" data-idx="'+i+'"><span class="ro-dot"></span><span><span class="ro-label">'+p.label+'</span>'+(p.sub?'<span class="ro-sub">'+p.sub+'</span>':'')+'</span><span class="ro-price">'+price+'</span></div>';
  });
  $('s2options').innerHTML=html;
  // store current pkgs list so the delegated listener below can reference it
  $('s2options').setAttribute('data-notary',bk.notaryPrints?'1':'0');
}

$('extraPages').addEventListener('input',function(){
  var total=parseInt(this.value)||0;
  if(total<=150){$('extraResult').textContent='Please enter more than 150.';bk.extraFee=0;return;}
  var over=total-150;
  bk.extraFee=Math.round(over*0.5*100)/100;
  $('extraResult').textContent='$150.00 base + '+over+' extra pages x $0.50 = $'+bk.extraFee.toFixed(2)+' extra → Total package: $'+(150+bk.extraFee).toFixed(2);
});

// Single static listener for s2options - won't stack on back/forward
$('s2options').addEventListener('click',function(e){
  var target=e.target;
  while(target&&target!==this){
    if(target.classList.contains('s2opt')){
      var isNotary=$('s2options').getAttribute('data-notary')==='1';
      var pkgs=isNotary?PKGS_NOTARY:PKGS_CUSTOMER;
      document.querySelectorAll('.s2opt').forEach(function(r){r.classList.remove('sel');r.querySelector('.ro-dot').style.background='';r.querySelector('.ro-dot').style.borderColor='#ddd';});
      target.classList.add('sel'); target.querySelector('.ro-dot').style.background='var(--gold)'; target.querySelector('.ro-dot').style.borderColor='var(--gold)';
      var idx=parseInt(target.getAttribute('data-idx'));
      var p=pkgs[idx];
      bk.pkgFee=p.fee; bk.pkgLabel=p.label; bk.extraFee=0;
      $('s2extra').style.display=p.extra?'block':'none';
      if(!p.extra){$('extraPages').value='';$('extraResult').textContent='';}
      return;
    }
    target=target.parentNode;
  }
});

$('s2back').addEventListener('click',function(){goStep(1);});
$('s2next').addEventListener('click',function(){
  if(!bk.pkgLabel){alert('Please select a package size.');return;}
  if($('s2extra').style.display==='block'){
    var ep=parseInt($('extraPages').value)||0;
    if(ep<=150){alert('Please enter a total page count greater than 150.');return;}
  }
  goStep(bk.notaryPrints?3:4);
});

// ---- STEP 3 ----
$('s3back').addEventListener('click',function(){goStep(2);});
$('s3next').addEventListener('click',function(){goStep(4);});

// ---- STEP 4 ----
function checkDateTime(){
  var d=$('prefDate').value, t=$('prefTime').value;
  if(!d||!t){$('s4display').style.display='none';$('ahAlert').style.display='none';return;}
  var dt=new Date(d+'T'+t);
  var h=dt.getHours(), dow=dt.getDay();
  var isAH=(h>=20||h<8), isSun=(dow===0), isHol=(HOLIDAYS.indexOf(d)>=0);
  bk.ahFee=(isAH||isSun||isHol)?35:0; bk.prefDate=d; bk.prefTime=t;
  bk.timeDisplay=dt.toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  var tags='';
  if(isSun) tags+=' <span style="background:#fff3cd;color:#856404;padding:.15rem .45rem;border-radius:4px;font-size:.78rem;">Sunday +$35</span>';
  if(isHol) tags+=' <span style="background:#f8d7da;color:#842029;padding:.15rem .45rem;border-radius:4px;font-size:.78rem;">Holiday +$35</span>';
  if(isAH&&!isSun&&!isHol) tags+=' <span style="background:#fff3cd;color:#856404;padding:.15rem .45rem;border-radius:4px;font-size:.78rem;">After-Hours +$35</span>';
  $('s4display').style.display='block'; $('s4display').innerHTML='&#x2705; <strong>'+bk.timeDisplay+'</strong>'+tags;
  $('ahAlert').style.display=bk.ahFee>0?'block':'none';
}
$('prefDate').addEventListener('change',checkDateTime);
$('prefTime').addEventListener('change',checkDateTime);
$('s4back').addEventListener('click',function(){goStep(bk.notaryPrints?3:2);});
$('s4next').addEventListener('click',function(){
  if(!bk.prefDate||!bk.prefTime){alert('Please select a date and time.');return;}
  goStep(5);
});

// ---- STEP 5 ----
// Quiet place
$('ro-quiet-yes').addEventListener('click',function(){
  selectRo('ro-quiet-yes','ro-quiet-no',null); bk.needsLocation=false;
});
$('ro-quiet-no').addEventListener('click',function(){
  selectRo('ro-quiet-no','ro-quiet-yes',null); bk.needsLocation=true;
});

// Signer buttons
$('signerGrid').addEventListener('click',function(e){
  var btn=e.target;
  while(btn&&btn!=$('signerGrid')){
    if(btn.classList.contains('signer-btn')){
      document.querySelectorAll('.signer-btn').forEach(function(b){b.classList.remove('sel');});
      btn.classList.add('sel');
      bk.signers=parseInt(btn.getAttribute('data-n'));
      bk.sigFee=bk.signers>2?(bk.signers-2)*25:0;
      return;
    }
    btn=btn.parentNode;
  }
});

// Witness checkbox - use change on input to avoid label double-fire
$('needsWitness').addEventListener('change',function(e){
  e.stopPropagation();
  bk.witFee=this.checked?50:0;
  $('co-witness').classList.toggle('sel',this.checked);
});
$('co-witness').addEventListener('click',function(e){
  // prevent double-fire if click lands on the input itself
  if(e.target.tagName==='INPUT') return;
  e.preventDefault();
  $('needsWitness').checked=!$('needsWitness').checked;
  bk.witFee=$('needsWitness').checked?50:0;
  this.classList.toggle('sel',$('needsWitness').checked);
});

// Table checkbox
$('needsTable').addEventListener('change',function(e){
  e.stopPropagation();
  $('co-table').classList.toggle('sel',this.checked);
});
$('co-table').addEventListener('click',function(e){
  if(e.target.tagName==='INPUT') return;
  e.preventDefault();
  $('needsTable').checked=!$('needsTable').checked;
  this.classList.toggle('sel',$('needsTable').checked);
});

// Comments char count
$('comments').addEventListener('input',function(){$('charCount').textContent=(300-this.value.length)+' characters remaining';});

// Mileage
$('calcMilesBtn').addEventListener('click',function(){
  var addr=$('sigAddr').value.trim();
  if(!addr){alert('Please enter the signing address first.');return;}
  var btn=$('calcMilesBtn'), res=$('mileageResult');
  btn.disabled=true; btn.textContent='Calculating...';
  res.innerHTML='<span style="color:var(--gray);font-size:.82rem;">Looking up address...</span>';
  fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(addr)+'&limit=1&countrycodes=us')
  .then(function(r){return r.json();})
  .then(function(data){
    if(!data||!data[0])throw new Error('not found');
    res.innerHTML='<span style="color:var(--gray);font-size:.82rem;">Calculating road distance...</span>';
    return fetch('https://router.project-osrm.org/route/v1/driving/-85.8697,37.6951;'+data[0].lon+','+data[0].lat+'?overview=false').then(function(r){return r.json();}).then(function(rd){
      if(!rd||!rd.routes||!rd.routes[0])throw new Error('no route');
      return Math.round(rd.routes[0].distance/1609.34);
    });
  })
  .then(function(mi){
    bk.miles=mi; bk.milesCalc=true;
    if(mi<=30){bk.milesFee=0;res.innerHTML='<span style="color:var(--green);font-size:.85rem;font-weight:700;">&#x2705; '+mi+' miles &mdash; travel included!</span>';}
    else{var ex=mi-30;bk.milesFee=ex*5;res.innerHTML='<span style="color:#c9a84c;font-size:.85rem;font-weight:700;">&#128205; '+mi+' miles &mdash; '+ex+' beyond 30 = <strong>+$'+bk.milesFee+' travel fee</strong></span>';}
    btn.disabled=false; btn.textContent='Recalculate';
  })
  .catch(function(){
    bk.miles=1; bk.milesCalc=true;
    res.innerHTML='<span style="color:#856404;font-size:.82rem;">&#9888; Could not calculate distance. Travel fee confirmed at signing.</span>';
    btn.disabled=false; btn.textContent='Recalculate';
  });
});

$('s5back').addEventListener('click',function(){goStep(4);});
$('s5next').addEventListener('click',function(){
  if(!$('custName').value.trim()){alert('Please enter your full name.');return;}
  if(!$('custEmail').value.trim()){alert('Please enter your email.');return;}
  if(!$('custPhone').value.trim()){alert('Please enter your phone number.');return;}
  if(!$('sigAddr').value.trim()){alert('Please enter the signing address.');return;}
  if(!$('sigCounty').value.trim()){alert('Please enter the county.');return;}
  if(!bk.milesCalc){alert('Please click "Calculate Travel Fee" before continuing.');return;}
  bk.sigCounty=$('sigCounty').value.trim();
  goStep(6);
});

// ---- STEP 6 ----
$('agreeBox').addEventListener('change',function(){
  var btn=$('s6next'); btn.disabled=!this.checked;
  btn.style.opacity=this.checked?'1':'.5'; btn.style.cursor=this.checked?'pointer':'not-allowed';
});
$('s6back').addEventListener('click',function(){goStep(5);});
$('s6next').addEventListener('click',function(){goStep(7);});

// ---- STEP 7 ----
$('s7back').addEventListener('click',function(){goStep(6);});

function loadStripe(){
  if(bk.isTitleCo)return;
  if(!stripe){
    var s=document.createElement('script'); s.src='https://js.stripe.com/v3/';
    s.onload=function(){
      stripe=Stripe(SK);
      var els=stripe.elements();
      cardEl=els.create('card',{style:{base:{fontSize:'16px',color:'#1a2744','::placeholder':{color:'#9ca3af'}},invalid:{color:'#e53e3e'}}});
      cardEl.mount('#card-element');
      cardEl.on('change',function(e){$('card-errors').textContent=e.error?e.error.message:'';});
    };
    document.head.appendChild(s);
  }
}

// Promo code
$('promoToggle').addEventListener('click',function(){
  var f=$('promoField'); f.style.display=f.style.display==='block'?'none':'block';
});
$('promoCode').addEventListener('input',function(){
  var v=this.value.trim().toUpperCase(), msg=$('promoMsg');
  if(v===PROMO){
    bk.isTitleCo=true; msg.style.color='var(--green)';
    msg.textContent='✓ Title company code accepted. Invoice will be emailed.';
    $('cardSection').style.display='none'; $('payBtn').textContent='Confirm Booking & Send Invoice';
  } else if(v.length>0){
    bk.isTitleCo=false; msg.style.color='#e53e3e'; msg.textContent='Invalid code.';
    $('cardSection').style.display='block'; $('payBtn').textContent='Pay & Schedule Appointment →';
  } else {
    bk.isTitleCo=false; msg.textContent='';
    $('cardSection').style.display='block'; $('payBtn').textContent='Pay & Schedule Appointment →';
  }
});

var AGENT_EMAILS={beth:'beth@notarybluegrass.com',luiggi:'luiggi@notarybluegrass.com'};

$('payBtn').addEventListener('click',async function(){
  var btn=this;
  var agentEmail=AGENT_EMAILS[bk.agent]||'info@notarybluegrass.com';
  var custEmail=$('custName').value.trim(); // capture before async
  var custName=$('custName').value.trim();
  var custEmailVal=$('custEmail').value.trim();
  var custPhone=$('custPhone').value.trim();
  var bd={
    _subject:'NEW BOOKING - NotaryBluegrass.com',
    _replyto:agentEmail,
    agent:bk.agent,
    agent_email:agentEmail,
    notify_also:'info@notarybluegrass.com, '+agentEmail,
    customer_name:custName, customer_email:custEmailVal,
    customer_phone:custPhone, notary_prints:bk.notaryPrints, package:bk.pkgLabel,
    signers:bk.signers, address:$('sigAddr').value, county:bk.sigCounty, preferred_time:bk.timeDisplay,
    document_type:$('docType').value, comments:$('comments').value,
    witness_needed:bk.witFee>0, needs_table:$('needsTable').checked, needs_location_help:bk.needsLocation,
    double_sided_copy:$('wantsDbl').checked, miles:bk.miles, travel_fee:'$'+bk.milesFee,
    after_hours:bk.ahFee>0, total:'$'+calcTotal()
  };
  if(bk.isTitleCo){
    btn.disabled=true; btn.textContent='Sending…';
    bd._subject='TITLE COMPANY INVOICE - NotaryBluegrass.com'; bd.type='TITLE_COMPANY_INVOICE';
    try{await fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd)});}catch(e){}
    btn.disabled=false; btn.textContent='Confirm Booking & Send Invoice';
    goStep(8); return;
  }
  btn.disabled=true; btn.textContent='Processing…';
  var cn=$('cardName').value.trim();
  if(!cn){btn.disabled=false;btn.textContent='Pay & Schedule Appointment →';$('card-errors').textContent='Please enter the name on your card.';return;}
  var result=await stripe.createPaymentMethod({type:'card',card:cardEl,billing_details:{name:cn}});
  if(result.error){$('card-errors').textContent=result.error.message;btn.disabled=false;btn.textContent='Pay & Schedule Appointment →';return;}
  bd._subject='NEW PAID BOOKING - NotaryBluegrass.com'; bd.type='PAID'; bd.stripe_pm=result.paymentMethod.id;
  try{await fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd)});}catch(e){}
  goStep(8);
});

// ---- STEP 8: Calendly ----
function loadCal(){
  var embed=$('calEmbed'); embed.innerHTML='';
  var custName=encodeURIComponent($('custName').value.trim());
  var custEmail=encodeURIComponent($('custEmail').value.trim());
  var url=CAL[bk.agent]+'?hide_gdpr_banner=1&primary_color=c9a84c&name='+custName+'&email='+custEmail;
  // Pre-navigate to the date the customer already selected
  if(bk.prefDate){
    var month=bk.prefDate.substring(0,7); // YYYY-MM
    url+='&month='+month+'&date='+bk.prefDate;
  }
  // Use Calendly's official embed approach with data-url attribute
  embed.innerHTML='<div class="calendly-inline-widget" data-url="'+url+'" style="min-width:280px;height:630px;"></div>';
  var ex=$('calScript'); if(ex)ex.remove();
  var s=document.createElement('script'); s.id='calScript'; s.src='https://assets.calendly.com/assets/external/widget.js'; s.async=true;
  document.head.appendChild(s);
}

// Calendly event listener — must be on window, Calendly posts from its iframe
function handleCalendlyMessage(e){
  // Accept messages from calendly.com only
  if(!e.origin||e.origin.indexOf('calendly.com')===-1) return;
  var data=e.data;
  if(!data||!data.event) return;
  if(data.event==='calendly.event_scheduled'){
    var t='';
    try{ t=data.payload.event.start_time||''; }catch(err){}
    var agentEmail=AGENT_EMAILS[bk.agent]||'info@notarybluegrass.com';
    var custEmailVal=$('custEmail').value.trim();
    var finalTime=t ? new Date(t).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) : 'your scheduled time';
    var conf={
      _subject:'SIGNING CONFIRMED - NotaryBluegrass.com',
      _replyto:agentEmail,
      agent_email:agentEmail,
      type:'CALENDLY_CONFIRMED',
      customer_name:$('custName').value.trim(),
      customer_email:custEmailVal,
      customer_phone:$('custPhone').value.trim(),
      agent:bk.agent,
      scheduled_time:finalTime,
      package:bk.pkgLabel,
      total:'$'+calcTotal(),
      address:$('sigAddr').value+(bk.sigCounty?', '+bk.sigCounty:''),
      notify_also:'info@notarybluegrass.com, '+agentEmail
    };
    fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(conf)}).catch(function(){});
    setTimeout(function(){
      $('successTitle').textContent="You're All Set!";
      $('successMsg').textContent='Your appointment is confirmed for '+finalTime+'. A confirmation email is on its way to '+custEmailVal+'. We look forward to serving you!';
      goStep('success');
    },1500);
  }
}
window.addEventListener('message', handleCalendlyMessage);

// Block ALL clicks and keys inside the modal from reaching the overlay
document.getElementById('bModal').addEventListener('click',function(e){e.stopPropagation();});
document.getElementById('bModal').addEventListener('keydown',function(e){e.stopPropagation();});
document.getElementById('bModal').addEventListener('mousedown',function(e){e.stopPropagation();});

// Prevent ANY keypress/click inside inputs from bubbling to overlay
document.querySelectorAll('.bi,.bsel,.bta').forEach(function(el){
  el.addEventListener('click',function(e){e.stopPropagation();});
  el.addEventListener('keydown',function(e){e.stopPropagation();});
});
function tog(w,b){document.getElementById(w).classList.toggle('open');document.getElementById(b).classList.toggle('open');}
document.getElementById('bethFeeBtn').addEventListener('click',function(){tog('bethFees','bethFeeBtn');});
document.getElementById('bethMsgBtn').addEventListener('click',function(){tog('bethMsg','bethMsgBtn');});
document.getElementById('luiggiFeeBtn').addEventListener('click',function(){tog('luiggiFees','luiggiFeeBtn');});
document.getElementById('luiggiMsgBtn').addEventListener('click',function(){tog('luiggiMsg','luiggiMsgBtn');});
