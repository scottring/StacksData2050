import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'; dotenv.config()
const sb=createClient(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}})
const SITE='http://localhost:3000'
const SHEET_NAME='Kemira FennoSil 220 — Silicone Defoamer (Pulp)'
const PLANTS=[{name:'UPM Kaukas Pulp Mill',code:'kaukas'},{name:'UPM Kymi Pulp Mill',code:'kymi'}]
const ROLES=['procurement','incident_officer','water_protection','pqm','security_specialist','head_procurement','operator_brk','fire_protection'] as const
const REVIEWERS=[
 {email:'a.virtanen@dev-upm.fake',first_name:'Anna',last_name:'Virtanen',role:'procurement'},
 {email:'j.makinen@dev-upm.fake',first_name:'Juha',last_name:'Mäkinen',role:'incident_officer'},
 {email:'l.korhonen@dev-upm.fake',first_name:'Liisa',last_name:'Korhonen',role:'water_protection'},
 {email:'m.nieminen@dev-upm.fake',first_name:'Mikko',last_name:'Nieminen',role:'pqm'},
 {email:'s.laine@dev-upm.fake',first_name:'Sari',last_name:'Laine',role:'security_specialist'},
 {email:'p.jarvinen@dev-upm.fake',first_name:'Pekka',last_name:'Järvinen',role:'head_procurement'},
 {email:'h.salonen@dev-upm.fake',first_name:'Heikki',last_name:'Salonen',role:'operator_brk'},
 {email:'t.heikkila@dev-upm.fake',first_name:'Tuula',last_name:'Heikkilä',role:'fire_protection'},
]
const ZONE_A={requesting_department:'Fiber Line / Brownstock Washing',asi_identification_number:'UPM-PULP-2026-0188',date_of_introduction:'2026-06-01',chemical_characterization:'Silicone-based defoamer emulsion, aqueous',product_group:'Defoamer',rating_class:'Class B — Process Chemical',product_hierarchy:'Pulp chemicals > Washing & screening > Defoamers',material_allocation:{SM:[],PM:[],UT:['Fiber line'],ZF:[]},purpose_of_use:'Foam control in brownstock washing and oxygen delignification',aim_of_introduction:'Reduce entrained air and improve washer efficiency vs the incumbent defoamer.',manufacturer_supplier:'Kemira Oyj',solids_content_pct:18.0,active_ingredient_pct:10.0,density_kg_m3:1010,mission:'Dose to brownstock washer feed at 50–150 g/t.',location:'Fiber line, BSW dilution header',volume_number:'1 x 1000 L IBC per week (expected)',storage_location:'Chemical storage hall, Bay 2',storage_type:'IBC, bunded floor, indoor',packaging:'1000 L IBC with secondary containment'}
const ZONE_B={product_questionnaire_included:true,substitute_testing_for_hazardous:true,system_compatibility_checked:true,process_change_required:false,notes_requirements:'Brownstock washer trial confirmed improved drainage at reduced dosage.',incident_ordinance_relevant:false,gefstoffv_hazardous:false,wgk_class:'1',sdb_revision_date:'2026-02-10'}
const OWNED:Record<string,string[]>={procurement:['mat_no_ek'],incident_officer:['incident_ordinance_relevant'],water_protection:['wgk_class'],pqm:['system_compatibility_checked'],security_specialist:['gefstoffv_hazardous'],head_procurement:[],operator_brk:[],fire_protection:[]}

async function ensureUser(r:any,companyId:string){
  const ex=await sb.from('users').select('id').eq('email',r.email).maybeSingle()
  if(ex.data) return ex.data.id
  const au=await sb.auth.admin.createUser({email:r.email,email_confirm:true,user_metadata:{first_name:r.first_name,last_name:r.last_name}})
  if(au.error||!au.data.user) throw new Error('auth create '+r.email+': '+au.error?.message)
  const ins=await sb.from('users').insert({id:au.data.user.id,email:r.email,first_name:r.first_name,last_name:r.last_name,full_name:`${r.first_name} ${r.last_name}`,company_id:companyId,role:'reviewer',has_logged_in:false})
  if(ins.error) throw new Error('users insert '+r.email+': '+ins.error.message)
  return au.data.user.id
}
async function ensurePlant(companyId:string,p:any){
  const ex=await sb.from('plants').select('id').eq('company_id',companyId).eq('code',p.code).maybeSingle()
  if(ex.data) return ex.data.id
  const ins=await sb.from('plants').insert({company_id:companyId,name:p.name,code:p.code}).select('id').single()
  if(ins.error) throw new Error('plant '+p.code+': '+ins.error.message)
  return ins.data.id
}
async function buildWorkflow(companyId:string,plantId:string,sheetId:string,requestor:string,userIdByRole:Map<string,string>,opts:{status:string,signedCount:number,daysAgo:number}){
  let wf=await sb.from('product_introduction_workflows').select('id').eq('sheet_id',sheetId).eq('plant_id',plantId).maybeSingle()
  let wfId:string
  const base={company_id:companyId,plant_id:plantId,sheet_id:sheetId,requestor_user_id:requestor,status:opts.status,submitted_at:new Date(Date.now()-opts.daysAgo*86400000).toISOString(),approved_at:opts.status==='approved'?new Date().toISOString():null,zone_a_data:ZONE_A,zone_b_data:ZONE_B}
  if(wf.data){wfId=wf.data.id; await sb.from('product_introduction_workflows').update(base).eq('id',wfId)}
  else{const ins=await sb.from('product_introduction_workflows').insert(base).select('id').single(); if(ins.error)throw new Error('wf: '+ins.error.message); wfId=ins.data.id}
  await sb.from('workflow_steps').delete().eq('workflow_id',wfId)
  const now=Date.now()
  const rows=ROLES.map((role,i)=>{const signed=i<opts.signedCount; return {workflow_id:wfId,step_order:i+1,role,decision:signed?'approved':'pending',owned_fields:OWNED[role]??[],signed_at:signed?new Date(now-(opts.signedCount-i)*86400000).toISOString():null,signed_by_user_id:signed?(userIdByRole.get(role)??null):null}})
  const se=await sb.from('workflow_steps').insert(rows); if(se.error)throw new Error('steps: '+se.error.message)
  return wfId
}
async function main(){
  // 1. UPM company
  let upm=await sb.from('companies').select('id').ilike('name','UPM').maybeSingle()
  let upmId:string
  if(upm.data){upmId=upm.data.id}
  else{const ins=await sb.from('companies').insert({name:'UPM',name_lower_case:'upm',type:'customer',active:true}).select('id').single(); if(ins.error)throw new Error('company: '+ins.error.message); upmId=ins.data.id}
  console.log('UPM company:',upmId)
  // 2. plants
  const plantIds:Record<string,string>={}
  for(const p of PLANTS){plantIds[p.code]=await ensurePlant(upmId,p); console.log('plant',p.name,plantIds[p.code])}
  // 3. reviewers + assignments to BOTH plants
  const userIdByRole=new Map<string,string>()
  for(const r of REVIEWERS){const uid=await ensureUser(r,upmId); userIdByRole.set(r.role,uid)
    for(const code of Object.keys(plantIds)){await sb.from('plant_role_assignments').upsert({plant_id:plantIds[code],user_id:uid,role:r.role},{onConflict:'plant_id,user_id,role',ignoreDuplicates:true})}}
  console.log('reviewers + assignments done')
  // 4. requestor = super admin
  const admin=await sb.from('users').select('id').eq('email','admin@devcustomer.test').single()
  const requestor=admin.data!.id
  // 5. sheet
  let sh=await sb.from('sheets').select('id').eq('company_id',upmId).eq('name',SHEET_NAME).maybeSingle()
  let sheetId:string
  if(sh.data){sheetId=sh.data.id}
  else{const ins=await sb.from('sheets').insert({name:SHEET_NAME,name_lower_case:SHEET_NAME.toLowerCase(),company_id:upmId,status:'draft',new_status:'draft',mark_as_test_sheet:true,created_by:requestor}).select('id').single(); if(ins.error)throw new Error('sheet: '+ins.error.message); sheetId=ins.data.id}
  console.log('sheet:',sheetId)
  // 6. two workflows
  const wfA=await buildWorkflow(upmId,plantIds['kaukas'],sheetId,requestor,userIdByRole,{status:'in_review',signedCount:2,daysAgo:3})
  const wfB=await buildWorkflow(upmId,plantIds['kymi'],sheetId,requestor,userIdByRole,{status:'approved',signedCount:8,daysAgo:12})
  // 7. a condition on each
  const proc=userIdByRole.get('procurement'),inc=userIdByRole.get('incident_officer')
  await sb.from('workflow_conditions').delete().in('workflow_id',[wfA,wfB])
  await sb.from('workflow_conditions').insert([
    {workflow_id:wfA,role:'procurement',user_id:proc,category:'other',body:'Mat. no. EK-55021 assigned. Pricing confirmed with Kemira; min order 1 IBC.',created_at:new Date(Date.now()-2*86400000).toISOString()},
    {workflow_id:wfB,role:'pqm',user_id:userIdByRole.get('pqm'),category:'other',body:'Washer trial at Kymi confirmed on-spec brightness; approved for continuous dosing.',created_at:new Date(Date.now()-5*86400000).toISOString()},
  ])
  console.log('\nDONE')
  console.log('List:',SITE+'/workflows')
  console.log('Mill A (Kaukas, in review):',SITE+'/workflows/'+wfA)
  console.log('Mill B (Kymi, approved):',SITE+'/workflows/'+wfB)
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(1)})
