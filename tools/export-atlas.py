import bpy,bmesh,json,os,sys,gzip
from array import array
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[sys.argv.index('--')+1]).resolve()
selected=json.loads((root/'assets/anatomy/source-selection.json').read_text())
wanted={x['name']:x for x in selected}
with bpy.data.libraries.load(str(source),link=False) as (src,dst):dst.objects=list(wanted)
for o in dst.objects:
 if o and o.type=='MESH':bpy.context.scene.collection.objects.link(o)
bpy.context.view_layer.update()
merged={};scale=1.8/1.75
for i,o in enumerate(dst.objects):
 if not o or o.type!='MESH':continue
 spec=wanted[o.name]; key=spec['id']+'.'+spec['side'] if spec['kind']=='muscle' else o.name
 mesh=o.data
 if spec['kind'] in ['muscle','face']:
  # Weld coincident seams before gentle surface smoothing; boundary vertices
  # stay fixed so adjacent anatomical components retain their attachment edges.
  mesh=mesh.copy();o.data=mesh
  bm=bmesh.new();bm.from_mesh(mesh)
  bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001)
  interior=[v for v in bm.verts if not v.is_boundary]
  for _ in range(3):
   bmesh.ops.smooth_vert(bm,verts=interior,factor=0.25,use_axis_x=True,use_axis_y=True,use_axis_z=True)
  bm.to_mesh(mesh);bm.free();mesh.update()
 if len(mesh.polygons)>3000:
  mod=o.modifiers.new('Web mesh reduction','DECIMATE');mod.ratio=min(1,3000/len(mesh.polygons))
  obj=o.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=obj.to_mesh()
 else:obj=None
 mesh.calc_loop_triangles()
 out=merged.setdefault(key,{'name':key,'kind':spec['kind'],'positions':array('f'),'indices':array('I'),'tendon':array('f')})
 off=len(out['positions'])//3
 for v in mesh.vertices:
  p=o.matrix_world@v.co;out['positions'].extend([-p.x*scale,p.z*scale,-p.y*scale])
 weights=[0.0]*len(mesh.vertices); counts=[0]*len(mesh.vertices)
 for tri in mesh.loop_triangles:
  out['indices'].extend([off+tri.vertices[0],off+tri.vertices[2],off+tri.vertices[1]])
  mat=mesh.materials[tri.material_index] if tri.material_index<len(mesh.materials) else None
  tendon=bool(mat and any(t in mat.name.lower() for t in ['tendon','aponeuro','fascia'])) or spec.get('id') in ['achilles-tendon','iliotibial-band']
  for v in tri.vertices: weights[v]+=float(tendon); counts[v]+=1
 out['tendon'].extend([w/max(c,1) for w,c in zip(weights,counts)])
 if obj:obj.to_mesh_clear()
 if i%50==0:print('Export',i,flush=True)
os.makedirs(root/'assets/anatomy',exist_ok=True)
manifest=[];offset=0
with open(root/'assets/anatomy/atlas.bin','wb') as f:
 for out in merged.values():
  p=out.pop('positions');inds=out.pop('indices');tendon=out.pop('tendon');out.update({'positionOffset':offset,'vertexCount':len(p)//3,'indexOffset':offset+len(p)*4,'indexCount':len(inds),'tendonOffset':offset+len(p)*4+len(inds)*4})
  f.write(p.tobytes());f.write(inds.tobytes());f.write(tendon.tobytes());offset+=len(p)*4+len(inds)*4+len(tendon)*4;manifest.append(out)
(root/'assets/anatomy/atlas.json').write_text(json.dumps(manifest,separators=(',',':')))
print('Saved',len(manifest),'meshes',offset,'bytes',flush=True)

(root/'assets/anatomy/atlas.bin.gz').write_bytes(gzip.compress((root/'assets/anatomy/atlas.bin').read_bytes(),compresslevel=9,mtime=0))
