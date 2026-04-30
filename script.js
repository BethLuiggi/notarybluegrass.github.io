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
  prefDate:'',prefTime:'',timeDisplay:'',scheduledTime:'',
  isTitleCo:false,needsLocation:false,milesCalc:false,
  titleFlow:false,promoChoice:null,tSigners:'',tAddr:'',tContact:''
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
  if(n===7){
    var pt=$('calPrefTime'); if(pt)pt.textContent=bk.timeDisplay||'your preferred time';
    loadCal();
  }
  if(n===8){
    var s8s=$('s8sched');
    if(s8s){
      if(bk.scheduledTime){
        s8s.style.display='block';
        s8s.innerHTML='&#x2705; Time reserved: <strong>'+bk.scheduledTime+'</strong>';
      } else { s8s.style.display='none'; }
    }
    buildInvoice('s8invoice');
    loadStripe();
  }
  curStep=(n==='success'?TOTAL_STEPS:n);
  document.querySelectorAll('.step').forEach(function(s){s.classList.remove('active');});
  var el=(n==='success')?$('sSuccess'):$('s'+n);
  if(el)el.classList.add('active');
  $('bModal').scrollTop=0;
  updateProg();
}

function updateProg(){
  var p=$('bProg');
  if(typeof curStep!=='number' || bk.titleFlow){ p.style.display='none'; p.innerHTML=''; return; }
  p.style.display=''; p.innerHTML='';
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
  if(bk.ahFee>0)lines.push([(bk.ahFee===35?'Holiday fee':'After-hours fee'),'+$'+bk.ahFee]);
  var h='<div class="invoice"><div class="inv-header"><div class="inv-logo"><strong style="font-family:Playfair Display,serif;font-size:1.1rem;">Bluegrass Notary LLC</strong></div>';
  var agentDisp=(bk.agent==='beth'?'Beth':(bk.agent==='luiggi'?'Luiggi':'TBD (assigned at scheduling)'));
  h+='<div class="inv-title"><strong>INVOICE</strong><br/>'+bk.timeDisplay+'<br/>Agent: '+agentDisp+'</div></div>';
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
  bk={agent:agent,notaryPrints:null,pkgFee:0,pkgLabel:'',extraFee:0,signers:2,sigFee:0,witFee:0,ahFee:0,milesFee:0,miles:0,prefDate:'',prefTime:'',timeDisplay:'',scheduledTime:'',isTitleCo:false,needsLocation:false,milesCalc:false,titleFlow:false,promoChoice:null,tSigners:'',tAddr:'',tContact:''};
  $('bAgentLabel').textContent=(agent==='either')?'Pick whoever\'s available first':('with '+(agent==='beth'?'Beth':'Luiggi'));
  $('bOverlay').classList.add('active');
  document.body.style.overflow='hidden';
  // Reset promo gate
  $('ro-promo-yes').classList.remove('sel'); $('ro-promo-yes').querySelector('.ro-dot').style.background=''; $('ro-promo-yes').querySelector('.ro-dot').style.borderColor='#ddd';
  $('ro-promo-no').classList.remove('sel'); $('ro-promo-no').querySelector('.ro-dot').style.background=''; $('ro-promo-no').querySelector('.ro-dot').style.borderColor='#ddd';
  $('sPromoCodeField').style.display='none';
  $('sPromoInput').value=''; $('sPromoMsg').textContent='';
  // Reset title-co quick form
  $('tSigners').value=''; $('tAddr').value=''; $('tDate').value=''; $('tContact').value='';
  $('tCalEmbed').innerHTML='';
  // Reset step 1
  $('ro-notary-prints').classList.remove('sel'); $('ro-notary-prints').querySelector('.ro-dot').style.background=''; $('ro-notary-prints').querySelector('.ro-dot').style.borderColor='#ddd';
  $('ro-customer-prints').classList.remove('sel'); $('ro-customer-prints').querySelector('.ro-dot').style.background=''; $('ro-customer-prints').querySelector('.ro-dot').style.borderColor='#ddd';
  // Reset step 4
  $('prefDate').value=''; $('prefTime').value='';
  var _now=new Date();
  $('prefDate').min=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0')+'-'+String(_now.getDate()).padStart(2,'0');
  $('ahAlert').style.display='none'; $('s4display').style.display='none';
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
  $('payBtn').textContent='Pay & Confirm Appointment →';
  goStep('Promo');
}

function closeBooking(){$('bOverlay').classList.remove('active');document.body.style.overflow='';}
$('bClose').addEventListener('click',function(e){e.stopPropagation();closeBooking();});
document.getElementById('bookBeth').addEventListener('click',function(){openBooking('beth');});
document.getElementById('bookLuiggi').addEventListener('click',function(){openBooking('luiggi');});
var _bookEither=document.getElementById('bookEither'); if(_bookEither) _bookEither.addEventListener('click',function(){openBooking('either');});

// ---- TITLE CO FAST PATH (sPromo / sTitle / sTitleCal) ----
$('ro-promo-yes').addEventListener('click',function(){
  bk.promoChoice='yes';
  selectRo('ro-promo-yes','ro-promo-no',null);
  $('sPromoCodeField').style.display='block';
});
$('ro-promo-no').addEventListener('click',function(){
  bk.promoChoice='no';
  selectRo('ro-promo-no','ro-promo-yes',null);
  $('sPromoCodeField').style.display='none';
  $('sPromoInput').value=''; $('sPromoMsg').textContent='';
});
$('sPromoInput').addEventListener('input',function(){
  var v=this.value.trim().toUpperCase(), msg=$('sPromoMsg');
  if(v===PROMO){ msg.style.color='var(--green)'; msg.textContent='✓ Code accepted.'; }
  else if(v.length>0){ msg.style.color='#e53e3e'; msg.textContent='Invalid code.'; }
  else { msg.textContent=''; }
});
$('sPromoNext').addEventListener('click',function(){
  if(bk.promoChoice==='yes'){
    var v=$('sPromoInput').value.trim().toUpperCase();
    if(v!==PROMO){ alert('Please enter a valid promo code, or select "No — Standard booking".'); return; }
    bk.titleFlow=true; bk.isTitleCo=true;
    var _now=new Date();
    $('tDate').min=_now.getFullYear()+'-'+String(_now.getMonth()+1).padStart(2,'0')+'-'+String(_now.getDate()).padStart(2,'0');
    goStep('Title');
  } else if(bk.promoChoice==='no'){
    bk.titleFlow=false;
    goStep(1);
  } else {
    alert('Please choose an option.');
  }
});

$('tBack').addEventListener('click',function(){ goStep('Promo'); });
$('tNext').addEventListener('click',function(){
  if(!$('tSigners').value.trim()){ alert('Please enter the names of all signers.'); return; }
  if(!$('tAddr').value.trim()){ alert('Please enter the signing address.'); return; }
  if(!$('tDate').value){ alert('Please select the date of signing.'); return; }
  var contact=$('tContact').value.trim();
  if(!contact){ alert('Please enter a phone number or email for the booker.'); return; }
  bk.prefDate=$('tDate').value;
  bk.tSigners=$('tSigners').value.trim();
  bk.tAddr=$('tAddr').value.trim();
  bk.tContact=contact;
  $('tCalDate').textContent=new Date(bk.prefDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  loadTitleCal();
  goStep('TitleCal');
});
$('tCalBack').addEventListener('click',function(){ goStep('Title'); });

function loadTitleCal(){
  var embed=$('tCalEmbed'); embed.innerHTML='';
  var contact=bk.tContact||'';
  var isEmail=contact.indexOf('@')>=0;
  var nameParam=encodeURIComponent('Title Co Booking');
  var emailParam=isEmail?encodeURIComponent(contact):'';
  var signersInline=(bk.tSigners||'').replace(/\n/g,', ');
  function buildTUrl(agent){
    var u=CAL[agent]+'?hide_gdpr_banner=1&primary_color=c9a84c&name='+nameParam
      +'&email='+emailParam
      +'&location='+encodeURIComponent(bk.tAddr||'')
      +'&a1='+encodeURIComponent(bk.tAddr||'')
      +'&a2='+encodeURIComponent('TITLE CO BOOKING — Signers: '+signersInline+' | Contact: '+contact);
    if(bk.prefDate){ u+='&month='+bk.prefDate.substring(0,7)+'&date='+bk.prefDate; }
    return u;
  }
  if(bk.agent==='either'){
    embed.innerHTML='<p style="font-size:.85rem;color:var(--gray);margin-bottom:1rem;text-align:center;font-style:italic;">Pick any open time slot below &mdash; the booking will go to whichever agent you choose.</p>'
      +'<div style="margin-bottom:2rem;"><h4 style="font-family:\'Playfair Display\',serif;color:var(--navy);margin-bottom:.6rem;font-size:1.1rem;">Beth&rsquo;s Availability</h4>'
      +'<div id="tCalBethBox"><div class="calendly-inline-widget" data-url="'+buildTUrl('beth')+'" style="min-width:280px;height:630px;"></div></div></div>'
      +'<div><h4 style="font-family:\'Playfair Display\',serif;color:var(--navy);margin-bottom:.6rem;font-size:1.1rem;">Luiggi&rsquo;s Availability</h4>'
      +'<div id="tCalLuiggiBox"><div class="calendly-inline-widget" data-url="'+buildTUrl('luiggi')+'" style="min-width:280px;height:630px;"></div></div></div>';
  } else {
    embed.innerHTML='<div class="calendly-inline-widget" data-url="'+buildTUrl(bk.agent)+'" style="min-width:280px;height:630px;"></div>';
  }
  var ex=$('calScript'); if(ex)ex.remove();
  var s=document.createElement('script'); s.id='calScript'; s.src='https://assets.calendly.com/assets/external/widget.js'; s.async=true;
  document.head.appendChild(s);
}

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
  function showErr(msg){
    bk.ahFee=0; bk.prefDate=''; bk.prefTime='';
    $('s4display').style.display='block';
    $('s4display').style.background='rgba(220,53,69,.1)';
    $('s4display').style.borderColor='#dc3545';
    $('s4display').style.color='#842029';
    $('s4display').innerHTML=msg;
    $('ahAlert').style.display='none';
  }
  if(!d){$('s4display').style.display='none';$('ahAlert').style.display='none';return;}
  var now=new Date();
  var todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  // Past date check
  if(d<todayStr){showErr('&#x26A0; Please choose a date in the future.');return;}
  // Sundays — closed (date alone is enough to flag)
  var sd=new Date(d+'T12:00:00');
  if(sd.getDay()===0){showErr('&#x26A0; We\'re closed on Sundays. Please choose Monday through Saturday.');return;}
  if(!t){$('s4display').style.display='none';$('ahAlert').style.display='none';return;}
  var dt=new Date(d+'T'+t);
  // Past time check (only if date is today)
  if(d===todayStr && dt<now){showErr('&#x26A0; Please choose a time in the future.');return;}
  // Reset to default gold style (in case an error was previously shown)
  $('s4display').style.background='rgba(201,168,76,.1)';
  $('s4display').style.borderColor='var(--gold)';
  $('s4display').style.color='var(--navy)';
  var h=dt.getHours();
  var isAH=(h>=20||h<8), isHol=(HOLIDAYS.indexOf(d)>=0);
  bk.ahFee=isHol?35:(isAH?25:0); bk.prefDate=d; bk.prefTime=t;
  bk.timeDisplay=dt.toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  var tags='';
  if(isHol) tags+=' <span style="background:#f8d7da;color:#842029;padding:.15rem .45rem;border-radius:4px;font-size:.78rem;">Holiday +$35</span>';
  else if(isAH) tags+=' <span style="background:#fff3cd;color:#856404;padding:.15rem .45rem;border-radius:4px;font-size:.78rem;">After-Hours +$25</span>';
  $('s4display').style.display='block';
  $('s4display').innerHTML='&#x2705; <strong>'+bk.timeDisplay+'</strong>'+tags;
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
    if(mi<=25){bk.milesFee=0;res.innerHTML='<span style="color:var(--green);font-size:.85rem;font-weight:700;">&#x2705; '+mi+' miles &mdash; travel included!</span>';}
    else{var ex=mi-25;bk.milesFee=ex*2;res.innerHTML='<span style="color:#c9a84c;font-size:.85rem;font-weight:700;">&#128205; '+mi+' miles &mdash; '+ex+' beyond 25 = <strong>+$'+bk.milesFee+' travel fee</strong></span>';}
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
  if(!$('sigCounty').value.trim()){alert('Please select your county.');return;}
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

// ---- STEP 7 (Schedule) ----
$('s7back').addEventListener('click',function(){goStep(6);});

// ---- STEP 8 (Payment) ----
$('s8back').addEventListener('click',function(){goStep(6);});

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
    $('cardSection').style.display='block'; $('payBtn').textContent='Pay & Confirm Appointment →';
  } else {
    bk.isTitleCo=false; msg.textContent='';
    $('cardSection').style.display='block'; $('payBtn').textContent='Pay & Confirm Appointment →';
  }
});

var AGENT_EMAILS={beth:'beth@bluegrass-notary.com',luiggi:'luiggi@bluegrass-notary.com'};

$('payBtn').addEventListener('click',async function(){
  var btn=this;
  var agentEmail=AGENT_EMAILS[bk.agent]||AGENT_EMAILS.beth;
  var custName=$('custName').value.trim();
  var custEmailVal=$('custEmail').value.trim();
  var custPhone=$('custPhone').value.trim();
  var displayTime=bk.scheduledTime||bk.timeDisplay;
  var sigAddr=$('sigAddr').value.trim();
  var sigCounty=bk.sigCounty||$('sigCounty').value.trim();
  var meetingLoc=sigAddr+(sigCounty?', '+sigCounty+' County':'');
  var bd={
    _subject:'NEW PAID BOOKING - Bluegrass-Notary.com',
    _replyto:agentEmail,
    agent:bk.agent,
    agent_email:agentEmail,
    notify_also:agentEmail,
    customer_name:custName, customer_email:custEmailVal,
    customer_phone:custPhone,
    meeting_location:meetingLoc,
    signing_address:sigAddr, signing_county:sigCounty,
    notary_prints:bk.notaryPrints, package:bk.pkgLabel,
    signers:bk.signers,
    preferred_time:bk.timeDisplay, scheduled_time:bk.scheduledTime||'',
    document_type:$('docType').value, comments:$('comments').value,
    witness_needed:bk.witFee>0, needs_table:$('needsTable').checked, needs_location_help:bk.needsLocation,
    double_sided_copy:$('wantsDbl').checked, miles:bk.miles, travel_fee:'$'+bk.milesFee,
    after_hours:bk.ahFee>0, total:'$'+calcTotal()
  };
  function showSuccess(){
    $('successTitle').textContent="You're All Set!";
    $('successMsg').textContent='Your appointment is confirmed for '+displayTime+'. A confirmation email is on its way to '+custEmailVal+'. We look forward to serving you!';
    goStep('success');
  }
  if(bk.isTitleCo){
    btn.disabled=true; btn.textContent='Sending…';
    bd._subject='TITLE COMPANY INVOICE - Bluegrass-Notary.com'; bd.type='TITLE_COMPANY_INVOICE';
    try{await fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd)});}catch(e){}
    btn.disabled=false;
    showSuccess(); return;
  }
  btn.disabled=true; btn.textContent='Processing…';
  var cn=$('cardName').value.trim();
  if(!cn){btn.disabled=false;btn.textContent='Pay & Confirm Appointment →';$('card-errors').textContent='Please enter the name on your card.';return;}
  var result=await stripe.createPaymentMethod({type:'card',card:cardEl,billing_details:{name:cn}});
  if(result.error){$('card-errors').textContent=result.error.message;btn.disabled=false;btn.textContent='Pay & Confirm Appointment →';return;}
  bd.type='PAID'; bd.stripe_pm=result.paymentMethod.id;
  try{await fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd)});}catch(e){}
  showSuccess();
});

// ---- STEP 7: Calendly ----
function buildCalUrl(agent){
  var custName=encodeURIComponent($('custName').value.trim());
  var custEmail=encodeURIComponent($('custEmail').value.trim());
  var sigAddr=$('sigAddr').value.trim();
  var sigCounty=bk.sigCounty||$('sigCounty').value.trim();
  var locFull=sigAddr+(sigCounty?', '+sigCounty+' County':'');
  var url=CAL[agent]+'?hide_gdpr_banner=1&primary_color=c9a84c&name='+custName+'&email='+custEmail
    +'&location='+encodeURIComponent(locFull)
    +'&a1='+encodeURIComponent(sigAddr)
    +'&a2='+encodeURIComponent(sigCounty);
  if(bk.prefDate){
    var month=bk.prefDate.substring(0,7);
    url+='&month='+month+'&date='+bk.prefDate;
  }
  return url;
}

function reloadCalScript(){
  var ex=$('calScript'); if(ex)ex.remove();
  var s=document.createElement('script'); s.id='calScript'; s.src='https://assets.calendly.com/assets/external/widget.js'; s.async=true;
  document.head.appendChild(s);
}

function loadCal(){
  var embed=$('calEmbed'); embed.innerHTML='';
  if(bk.agent==='either'){
    embed.innerHTML='<p style="font-size:.85rem;color:var(--gray);margin-bottom:1rem;text-align:center;font-style:italic;">Pick any open time slot below &mdash; your booking goes to whichever agent you choose.</p>'
      +'<div style="margin-bottom:2rem;"><h4 style="font-family:\'Playfair Display\',serif;color:var(--navy);margin-bottom:.6rem;font-size:1.1rem;">Beth&rsquo;s Availability</h4>'
      +'<div id="calBethBox"><div class="calendly-inline-widget" data-url="'+buildCalUrl('beth')+'" style="min-width:280px;height:630px;"></div></div></div>'
      +'<div><h4 style="font-family:\'Playfair Display\',serif;color:var(--navy);margin-bottom:.6rem;font-size:1.1rem;">Luiggi&rsquo;s Availability</h4>'
      +'<div id="calLuiggiBox"><div class="calendly-inline-widget" data-url="'+buildCalUrl('luiggi')+'" style="min-width:280px;height:630px;"></div></div></div>';
  } else {
    embed.innerHTML='<div class="calendly-inline-widget" data-url="'+buildCalUrl(bk.agent)+'" style="min-width:280px;height:630px;"></div>';
  }
  reloadCalScript();
}

// Detect which agent's calendar fired the event when bk.agent === 'either'.
// Matches the event source iframe against the per-agent containers in either flow.
function detectAgentFromCalEvent(e){
  if(bk.agent!=='either') return bk.agent;
  var ids=bk.titleFlow?['tCalBethBox','tCalLuiggiBox']:['calBethBox','calLuiggiBox'];
  var bethBox=document.getElementById(ids[0]), luiggiBox=document.getElementById(ids[1]);
  var bethIfr=bethBox&&bethBox.querySelector('iframe');
  var luiggiIfr=luiggiBox&&luiggiBox.querySelector('iframe');
  if(bethIfr && bethIfr.contentWindow===e.source) return 'beth';
  if(luiggiIfr && luiggiIfr.contentWindow===e.source) return 'luiggi';
  return 'beth'; // last-resort fallback (shouldn't normally hit)
}

// Calendly event listener — must be on window, Calendly posts from its iframe
function handleCalendlyMessage(e){
  // Accept messages from calendly.com only
  if(!e.origin||e.origin.indexOf('calendly.com')===-1) return;
  var data=e.data;
  if(!data||!data.event) return;
  if(data.event==='calendly.event_scheduled'){
    // If "either" flow, lock agent to whichever calendar fired this event
    if(bk.agent==='either'){
      bk.agent=detectAgentFromCalEvent(e);
      $('bAgentLabel').textContent='with '+(bk.agent==='beth'?'Beth':'Luiggi');
    }
    // Title-co fast path: confirm booking + email, no payment
    if(bk.titleFlow && curStep==='TitleCal'){
      var tt=''; try{ tt=data.payload.event.start_time||''; }catch(err){}
      var titleAgentEmail=AGENT_EMAILS[bk.agent]||AGENT_EMAILS.beth;
      var titleFinalTime=tt ? new Date(tt).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) : 'your scheduled time';
      bk.scheduledTime=titleFinalTime;
      var tContact=bk.tContact||'';
      var tIsEmail=tContact.indexOf('@')>=0;
      var tbd={
        _subject:'TITLE COMPANY BOOKING - Bluegrass-Notary.com',
        _replyto:titleAgentEmail,
        agent:bk.agent,
        agent_email:titleAgentEmail,
        notify_also:titleAgentEmail,
        type:'TITLE_COMPANY_BOOKING',
        promo_code:PROMO,
        signers:bk.tSigners,
        signing_address:bk.tAddr,
        signing_date:bk.prefDate,
        scheduled_time:titleFinalTime,
        booker_contact:tContact,
        booker_email:tIsEmail?tContact:'',
        booker_phone:tIsEmail?'':tContact
      };
      fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(tbd)}).catch(function(){});
      $('successTitle').textContent='Title Company Booking Confirmed!';
      $('successMsg').textContent='Booked for '+titleFinalTime+'. Added to our calendar. Confirmation '+(tIsEmail?'emailed to '+tContact:'sent to '+tContact)+'.';
      setTimeout(function(){ goStep('success'); },1200);
      return;
    }
    // Only act if the user is currently on the schedule step
    if(curStep!==7) return;
    var t='';
    try{ t=data.payload.event.start_time||''; }catch(err){}
    var agentEmail=AGENT_EMAILS[bk.agent]||AGENT_EMAILS.beth;
    var custEmailVal=$('custEmail').value.trim();
    var finalTime=t ? new Date(t).toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}) : 'your scheduled time';
    bk.scheduledTime=finalTime;
    // Send TIME RESERVED notification — audit trail for ghost-booking detection
    var sigAddr=$('sigAddr').value.trim();
    var sigCounty=bk.sigCounty||$('sigCounty').value.trim();
    var resv={
      _subject:'TIME RESERVED - Bluegrass-Notary.com',
      _replyto:agentEmail,
      agent_email:agentEmail,
      type:'TIME_RESERVED_PENDING_PAYMENT',
      customer_name:$('custName').value.trim(),
      customer_email:custEmailVal,
      customer_phone:$('custPhone').value.trim(),
      agent:bk.agent,
      scheduled_time:finalTime,
      package:bk.pkgLabel,
      total:'$'+calcTotal(),
      meeting_location:sigAddr+(sigCounty?', '+sigCounty+' County':''),
      signing_address:sigAddr,
      signing_county:sigCounty,
      notify_also:agentEmail
    };
    fetch('https://formspree.io/f/mdalpydd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(resv)}).catch(function(){});
    setTimeout(function(){ goStep(8); },1200);
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
document.getElementById('luiggiFeeBtn').addEventListener('click',function(){tog('luiggiFees','luiggiFeeBtn');});
