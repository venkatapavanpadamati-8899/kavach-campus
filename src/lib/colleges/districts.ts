// Andhra Pradesh Statewide Colleges Master Registry Dataset
// Covering all 26 gazetted districts of Andhra Pradesh (Reorganized on 4 April 2022)
// Sources: APSCHE, SBTET AP, AICTE, AISHE, UGC, JNTUK, JNTUA, AU, SVU

export interface DistrictRecord {
  id: string;
  name: string;
  headquarters: string;
  zone: 'North Coastal' | 'Central Coastal' | 'South Coastal' | 'Rayalaseema';
}

export const AP_26_DISTRICTS: DistrictRecord[] = [
  { id: 'alluri-sitharama-raju', name: 'Alluri Sitharama Raju', headquarters: 'Paderu', zone: 'North Coastal' },
  { id: 'anakapalli', name: 'Anakapalli', headquarters: 'Anakapalli', zone: 'North Coastal' },
  { id: 'ananthapuramu', name: 'Ananthapuramu', headquarters: 'Anantapur', zone: 'Rayalaseema' },
  { id: 'annamayya', name: 'Annamayya', headquarters: 'Rayachoti', zone: 'Rayalaseema' },
  { id: 'bapatla', name: 'Bapatla', headquarters: 'Bapatla', zone: 'Central Coastal' },
  { id: 'chittoor', name: 'Chittoor', headquarters: 'Chittoor', zone: 'Rayalaseema' },
  { id: 'dr-br-ambedkar-konaseema', name: 'Dr. B. R. Ambedkar Konaseema', headquarters: 'Amalapuram', zone: 'Central Coastal' },
  { id: 'east-godavari', name: 'East Godavari', headquarters: 'Rajamahendravaram', zone: 'Central Coastal' },
  { id: 'eluru', name: 'Eluru', headquarters: 'Eluru', zone: 'Central Coastal' },
  { id: 'guntur', name: 'Guntur', headquarters: 'Guntur', zone: 'Central Coastal' },
  { id: 'kakinada', name: 'Kakinada', headquarters: 'Kakinada', zone: 'Central Coastal' },
  { id: 'krishna', name: 'Krishna', headquarters: 'Machilipatnam', zone: 'Central Coastal' },
  { id: 'kurnool', name: 'Kurnool', headquarters: 'Kurnool', zone: 'Rayalaseema' },
  { id: 'nandyal', name: 'Nandyal', headquarters: 'Nandyal', zone: 'Rayalaseema' },
  { id: 'ntr', name: 'NTR', headquarters: 'Vijayawada', zone: 'Central Coastal' },
  { id: 'palnadu', name: 'Palnadu', headquarters: 'Narasaraopet', zone: 'Central Coastal' },
  { id: 'parvathipuram-manyam', name: 'Parvathipuram Manyam', headquarters: 'Parvathipuram', zone: 'North Coastal' },
  { id: 'prakasam', name: 'Prakasam', headquarters: 'Ongole', zone: 'South Coastal' },
  { id: 'sri-potti-sriramulu-nellore', name: 'Sri Potti Sriramulu Nellore', headquarters: 'Nellore', zone: 'South Coastal' },
  { id: 'sri-sathya-sai', name: 'Sri Sathya Sai', headquarters: 'Puttaparthi', zone: 'Rayalaseema' },
  { id: 'srikakulam', name: 'Srikakulam', headquarters: 'Srikakulam', zone: 'North Coastal' },
  { id: 'tirupati', name: 'Tirupati', headquarters: 'Tirupati', zone: 'Rayalaseema' },
  { id: 'visakhapatnam', name: 'Visakhapatnam', headquarters: 'Visakhapatnam', zone: 'North Coastal' },
  { id: 'vizianagaram', name: 'Vizianagaram', headquarters: 'Vizianagaram', zone: 'North Coastal' },
  { id: 'west-godavari', name: 'West Godavari', headquarters: 'Bhimavaram', zone: 'Central Coastal' },
  { id: 'ysr-kadapa', name: 'YSR (Kadapa)', headquarters: 'Kadapa', zone: 'Rayalaseema' },
];

