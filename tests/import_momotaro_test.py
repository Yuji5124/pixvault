import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts/import-momotaro.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class MomotaroImportTest(unittest.TestCase):
 def test_license_gate_and_native_order(self):
  rows=[{'path':'2d/Toon Characters/Poses HD/idle0.png','size':'192x256'}, {'path':'2d/Foliage Sprites/Flat/tree.png','size':'1024x1024'}, {'path':'2d/Animal Pack/dog.png','size':'256x256'}]
  licenses={p:{'license':'CC0; credit is not mandatory'} for p in ['Toon Characters','Foliage Sprites']}
  candidates=module.candidates(rows,licenses)
  self.assertEqual(len(candidates),2);self.assertEqual(candidates[0]['width'],1024)
 def test_scale_variants_are_not_new_art(self):
  self.assertEqual(module.canonical_source('2d/Toon Characters/Boy/Poses HD/idle0.png'),module.canonical_source('2d/Toon Characters/Boy/Poses/idle0.png'))
  self.assertEqual(module.canonical_source('2d/Background Elements Remastered/Retina/tree.png'),module.canonical_source('2d/Background Elements Remastered/tree.png'))
 def test_story_roles_from_camelcase(self):
  self.assertIn('森',module.story_roles('2d/Background Elements/Backgrounds/backgroundColorForest.png'))
  self.assertIn('犬',module.story_roles('2d/Animal Pack/dog.png'))
 def test_pose_grouping(self):
  group,index=module.animation_info('2d/Toon Characters/Boy/Poses/climb2.png','animation-frame')
  self.assertEqual(group,'toon-characters/climb');self.assertEqual(index,2)
  self.assertEqual(module.animation_info('2d/Toon Characters/Boy/Poses/back.png','animation-frame')[1],0)
 def test_repeated_tags_keep_existing_case_without_duplicates(self):
  self.assertEqual(module.merge_tags(['cc0','森'],['CC0','森','桃太郎']),['cc0','森','桃太郎'])
 def test_builder_parts_are_not_full_characters(self):
  self.assertEqual(module.classify('2d/Monster Builder Pack/arm_blueA.png')[0],'character-part')
  self.assertEqual(module.classify('2d/Character Pack/Hair/Black/blackWoman.png')[0],'character-part')
  self.assertEqual(module.classify('2d/RTS Medieval/Retina/medievalUnit_01.png')[0],'character')
 def test_kinds(self):
  self.assertEqual(module.classify('2d/Toon Characters/Boy/Poses HD/idle0.png')[0],'animation-frame')
  self.assertEqual(module.classify('2d/Background Elements Remastered/Backgrounds/forest.png')[0],'background')
  self.assertEqual(module.classify('2d/Animal Pack/dog.png')[0],'animal')
  self.assertEqual(module.resolution_prefix(128,128),'06-small')
if __name__=='__main__':unittest.main()
