/* All report generation stays on the patient's device. */
async function buildNeedsPDF(snapshot, families, date=new Date()) {
 const {PDFDocument,rgb}=PDFLib,doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const bytes=await Promise.all(['vendor/regular.ttf','vendor/bold.ttf','logo.png'].map(async p=>{let r=await fetch(p);if(!r.ok)throw Error('Ressource PDF indisponible');return r.arrayBuffer()}));
 const font=await doc.embedFont(bytes[0],{subset:true}),bold=await doc.embedFont(bytes[1],{subset:true}),logo=await doc.embedPng(bytes[2]);
 const teal=rgb(.13,.36,.40),wine=rgb(.61,.24,.32),gray=rgb(.37,.43,.43),light=rgb(.94,.96,.94),ink=rgb(.14,.22,.24);let page,y;
 const W=595.28,H=841.89,L=44,R=551,WIDTH=507;
 function raw(t,x,yy,size=10,f=font,color=ink){page.drawText(String(t),{x,y:yy,size,font:f,color})}
 function addPage(title,sub){page=doc.addPage([W,H]);page.drawImage(logo,{x:L,y:H-85,width:100,height:63.5});raw('MON BILAN DES BESOINS',315,H-47,10,bold,teal);raw(date.toLocaleDateString('fr-FR'),315,H-65,9,font,gray);page.drawLine({start:{x:L,y:H-101},end:{x:R,y:H-101},thickness:1,color:teal});y=H-133;if(title){raw(title,L,y,22,bold,teal);y-=24}if(sub)text(sub,10,gray);y-=12}
 function ensure(h){if(y-h<65)addPage('La suite de mon bilan','')}
 function lines(t,size=10,f=font,width=WIDTH){let result=[];for(let para of String(t??'').replace(/\r/g,'').split('\n')){let line='';for(let word of para.split(/\s+/)){if(!word)continue;if(f.widthOfTextAtSize(word,size)>width){if(line){result.push(line);line=''}let part='';for(let c of word){if(f.widthOfTextAtSize(part+c,size)>width){result.push(part);part=''}part+=c}line=part;continue}if(line&&f.widthOfTextAtSize(line+' '+word,size)>width){result.push(line);line=word}else line+=(line?' ':'')+word}result.push(line)}return result}
 function text(t,size=10,color=ink,f=font,width=WIDTH,x=L){for(let line of lines(t,size,f,width)){ensure(size*1.5);raw(line,x,y,size,f,color);y-=size*1.5}y-=6}
 function heading(t){ensure(55);y-=8;text(t,14,teal,bold)}
 function answer(label,value){ensure(48);text(label,10,teal,bold);text(value||'Non renseigné',10,value?ink:gray);y-=4}
 const ns=families.flatMap(g=>g.needs),v=id=>snapshot.needs[id]||{},selected=ns.filter(n=>v(n.id).priority),completed=ns.filter(n=>v(n.id).importance!=null&&v(n.id).satisfaction!=null).length;
 addPage('Faire le point sur mes besoins','Un support personnel pour préparer et nourrir le dialogue en séance.');
 heading('Mes coordonnées');answer('Adresse mail du patient',snapshot.patient?.email);answer('Numéro de téléphone du patient',snapshot.patient?.phone);
 text(completed+' / 31 besoins évalués sur les deux échelles',12,teal,bold);
 text('Importance : 0 = peu important ; 10 = essentiel. Satisfaction : 1 = très peu satisfait ; 5 = totalement satisfait. Une absence de réponse est indiquée par un tiret.');
 heading('Mes priorités choisies');text(selected.length?selected.map(n=>n.name).join(' • '):'Aucune priorité sélectionnée.');
 heading('Vue d’ensemble');
 const tableHeader=()=>{ensure(34);page.drawRectangle({x:L,y:y-10,width:WIDTH,height:25,color:light});raw('Besoin',L+8,y,9,bold,teal);raw('Importance / 10',360,y,9,bold,teal);raw('Satisf. / 5',465,y,9,bold,teal);y-=30};tableHeader();
 for(const g of families){ensure(65);text(g.title,10,teal,bold);for(const n of g.needs){if(y<89){addPage('Vue d’ensemble · suite','');tableHeader()}let a=v(n.id);raw((a.priority?'★ ':'')+n.name,L+8,y,9,a.priority?bold:font);raw(a.importance==null?'—':String(a.importance),390,y,10,bold,wine);raw(a.satisfaction==null?'—':String(a.satisfaction),490,y,10,bold,teal);page.drawLine({start:{x:L,y:y-7},end:{x:R,y:y-7},thickness:.4,color:light});y-=22}y-=6}
 addPage('Mes mots, mes situations','Les notes personnelles sont regroupées par famille de besoins.');let notes=false;
 for(const g of families){let rows=g.needs.filter(n=>v(n.id).note?.trim());if(!rows.length)continue;notes=true;heading(g.title);for(const n of rows)answer(n.name,v(n.id).note)}if(!notes)text('Aucune note personnelle renseignée.');
 heading('Ce que je retiens');const qs=['Quels besoins sont les mieux nourris ? Qu’est-ce qui m’a aidé ?','Quels besoins sont les moins satisfaits ? Quel impact dans mon quotidien ?','Qu’est-ce que cela changerait pour moi de mieux répondre à ces besoins ?'];qs.forEach((q,i)=>answer(q,snapshot.reflections[i]));
 addPage('Mes petits pas','Des actions concrètes, choisies à mon rythme.');if(!selected.length)text('Aucune priorité sélectionnée.');
 for(const n of selected){let a=snapshot.actions[n.id]||{};heading(n.name);text('Importance : '+(v(n.id).importance??'—')+'/10   ·   Satisfaction : '+(v(n.id).satisfaction??'—')+'/5',10,gray);answer('Mon action concrète',a.step);answer('Ce qui peut m’aider',a.help);answer('Quand essayer ?',a.date?new Date(a.date+'T12:00:00').toLocaleDateString('fr-FR'):'');text('Faisabilité : '+(a.feas??'Non renseignée')+(a.feas!=null?' / 100':''),11,wine,bold);if(a.feas!=null){ensure(28);page.drawRectangle({x:L,y:y-5,width:WIDTH,height:7,color:light});if(a.feas>0)page.drawRectangle({x:L,y:y-5,width:WIDTH*a.feas/100,height:7,color:teal});y-=27}y-=10}
 heading('À partager en séance');text('Ce bilan reflète mon ressenti au moment de la saisie. Il ne constitue ni un test validé, ni un diagnostic. Les priorités sont celles que j’ai choisies, sans interprétation automatique.');
 const pages=doc.getPages();pages.forEach((p,i)=>{page=p;page.drawLine({start:{x:L,y:46},end:{x:R,y:46},thickness:.5,color:light});raw('Ombaliz Thérapie · contact@ombaliz.com',L,31,8,font,gray);raw((i+1)+' / '+pages.length,510,31,8,font,gray)});
 doc.setTitle('Mon bilan des besoins - Ombaliz Thérapie');doc.setAuthor('Ombaliz Thérapie');return doc.save();
}
async function downloadNeedsPDF(){const b=document.querySelector('#download'),status=document.querySelector('#exportstatus');b.disabled=true;status.textContent='Préparation de votre rapport PDF…';try{let bytes=await buildNeedsPDF(JSON.parse(JSON.stringify(state)),groups);let url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download='Mon-bilan-besoins-Ombaliz-'+new Date().toISOString().slice(0,10)+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='Votre rapport PDF est prêt. Vous pouvez le conserver ou le joindre à un courriel.'}catch(e){status.textContent='Le PDF n’a pas pu être créé. Vérifiez votre connexion puis réessayez, ou utilisez Imprimer / PDF.'}finally{b.disabled=false}}
