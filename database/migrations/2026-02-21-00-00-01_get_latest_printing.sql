create function get_latest_printing_with_count(
  search text,
  off int default 0,
  lim int default null
)
returns table (
  data jsonb,
  total_count bigint
)
language sql
as $$
  with normalized as (
    select
      data,
      case
        when name like '%//%'
         and trim(split_part(name, '//', 1)) = trim(split_part(name, '//', 2))
        then trim(split_part(name, '//', 1))
        else name
      end as normalized_name
    from scryfall_data
    where name ilike '%' || search || '%'
      and data->>'setType' not in ('memorabilia', 'token')
  ),
  latest as (
    select distinct on (normalized_name)
      data
    from normalized
    order by
      normalized_name,
      (data->>'released_at')::date desc
  )
  select
    data,
    count(*) over() as total_count
  from latest
  offset off
  limit coalesce(lim, 2147483647);
$$;