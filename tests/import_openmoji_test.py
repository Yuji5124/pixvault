import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts/import-openmoji.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class SelectionTest(unittest.TestCase):
    def item(self,name,group='objects',sub='household',**kwargs):
        return dict(annotation=name,group=group,subgroups=sub,order='1',hexcode=kwargs.pop('hexcode','1F600'),**kwargs)
    def test_topics_variants_and_bound(self):
        candidates=[self.item('cat','animals-nature','animal-mammal'),self.item('tree','animals-nature','plant-other'),self.item('pistol'),self.item('wine glass'),self.item('unnamed drink',tags='alcohol, bar'),self.item('hand',skintone='1F3FB')]
        selected=module.select_items(candidates,2)
        self.assertEqual({i['annotation'] for i in selected},{'cat','tree'})
        self.assertRaises(ValueError,module.select_items,candidates,3)
    def test_categories_and_filename(self):
        self.assertEqual(module.category(self.item('bus','travel-places','transport-ground')),'vehicles')
        self.assertEqual(module.category(self.item('apple','food-drink','food-fruit')),'food')
        self.assertEqual(module.filename(self.item('cat / ../../test',hexcode='1F408')),'cat-test-1f408.png')

if __name__=='__main__':unittest.main()
