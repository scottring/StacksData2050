import { supabase } from './src/migration/supabase-client.js'

async function list() {
  const { data } = await supabase
    .from('sections')
    .select('name, order_number')
    .order('order_number')
  
  data?.forEach(s => console.log(s.order_number + '. ' + s.name))
}

list()
