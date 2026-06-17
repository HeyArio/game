-- =============================================================================
-- Quorum — mock user seed (3 000 users)
-- Run in the Supabase SQL editor (as postgres / service-role).
-- The on_auth_user_created trigger auto-creates profiles + user_progress rows.
-- We then UPDATE user_progress with varied, realistic-looking stats.
-- =============================================================================

do $$
declare
  first_names text[] := array[
    'Alex','Jordan','Morgan','Taylor','Casey','Riley','Avery','Quinn','Sage','River',
    'Blake','Drew','Reese','Finley','Hayden','Peyton','Dakota','Rowan','Skylar','Logan',
    'Jamie','Cameron','Spencer','Emerson','Parker','Charlie','Sawyer','Elliot','Ainsley','Sloane',
    'Nora','Leo','Miles','Isla','Zoe','Owen','Luna','Eli','Chloe','Liam',
    'Aisha','Marcus','Priya','Chen','Sofia','Andrei','Yuki','Omar','Fatima','Kofi',
    'Elena','Viktor','Amara','Ravi','Layla','Dmitri','Siona','Jae','Nia','Tariq',
    'Ingrid','Mateo','Zara','Henrik','Adaeze','Soren','Mila','Idris','Linh','Tobias',
    'Amelia','Noah','Ava','Ethan','Emma','Oliver','Sophia','Aiden','Isabella','Lucas',
    'Mia','Mason','Charlotte','Luca','Harper','Elijah','Aria','James','Evelyn','Benjamin'
  ];
  last_names text[] := array[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore',
    'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Lee',
    'Walker','Hall','Allen','Wright','Scott','Green','Baker','Adams','Nelson','Carter',
    'Mitchell','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart',
    'Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera','Cooper',
    'Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez','James','Watson',
    'Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson','Coleman',
    'Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores','Washington','Butler','Simmons',
    'Foster','Gonzales','Bryant','Alexander','Russell','Griffin','Diaz','Hayes','Myers','Ford',
    'Hamilton','Graham','Sullivan','Wallace','Woods','Cole','West','Jordan','Owens','Reynolds'
  ];
  colors text[] := array[
    '#58CC02','#1CB0F6','#FF4B4B','#FF9600','#CE82FF',
    '#00CD9C','#FF86D0','#FFC800','#4C97FF','#F7C948'
  ];

  i          int;
  uid        uuid;
  fname      text;
  lname      text;
  disp       text;
  email      text;
  color      text;
  xp_total   int;
  streak_val int;
  lvl        int;
begin
  for i in 1..3000 loop
    uid   := gen_random_uuid();
    fname := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    lname := last_names [1 + floor(random() * array_length(last_names,  1))::int];
    disp  := fname || ' ' || lname;
    email := lower(fname) || '.' || lower(lname) || i || '@quorum-mock.invalid';
    color := colors[1 + floor(random() * array_length(colors, 1))::int];

    -- Insert into auth.users (bypasses email verification for seed data)
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role
    ) values (
      uid, email, '',
      now() - (random() * interval '180 days'),
      now() - (random() * interval '180 days'),
      now() - (random() * interval '180 days'),
      now() - (random() * interval '30 days'),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', disp),
      false, 'authenticated'
    );

    -- Trigger creates profiles + user_progress automatically.
    -- Override avatar_color with our random pick.
    update public.profiles set avatar_color = color where id = uid;

    -- Randomised but plausible progress stats.
    xp_total   := floor(random() * 4500)::int;          -- 0 – 4 500 XP
    streak_val := floor(random() * 60)::int;             -- 0 – 60 day streak
    lvl        := greatest(1, floor(xp_total / 500)::int);

    update public.user_progress set
      total_xp          = xp_total,
      daily_xp          = floor(random() * 150)::int,
      streak             = streak_val,
      best_streak        = streak_val + floor(random() * 20)::int,
      level              = lvl,
      continuance_count  = floor(random() * 5)::int,
      daily_goal         = (array[20,30,50,100])[1 + floor(random()*4)::int],
      updated_at         = now() - (random() * interval '10 days')
    where user_id = uid;

  end loop;
end;
$$;
