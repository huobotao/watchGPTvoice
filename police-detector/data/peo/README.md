# PEO (Parking Enforcement Officer/Vehicle) Dataset (Phase 7)

This directory holds the **self-collected** dataset for fine-tuning a YOLO
model on parking enforcement vehicles (and later, officers).

> Why "vehicle first, officer second"? The Westward Go-4 / Cushman three-
> wheelers used by many US cities are visually distinct and visible from
> 50+ meters; the officer in uniform is much harder and rarely visible at
> useful range.

## Targets

| Class id | Name | Notes |
|----------|------|-------|
| 0 | `peo_vehicle` | Go-4, Cushman, GO-4 Interceptor, electric meter-maid carts |
| 1 | `peo_officer` | (later) Uniformed PEO on foot. Defer. |

## Directory layout

```
peo/
  images/
    train/
    val/
  labels/                  # YOLO txt format: cls cx cy w h (normalized)
    train/
    val/
  peo.yaml                 # dataset config consumed by `yolo train`
  scrape/                  # raw scraped images + sources before filtering
```

## Building the dataset (rough recipe)

1. Scrape candidate images:
   - Google / Bing image search: `"Go-4 parking enforcement"`,
     `"Cushman meter maid"`, `"DOT parking officer vehicle"`, plus city-specific
     variants (NYC, SF, LA, Chicago, Seattle, Boston, DC).
   - Flickr Commons + tagged photos with `parking enforcement` / `meter maid`.
   - YouTube screenshots from parking-enforcement vlogs (with permission /
     under fair use for non-commercial research).

2. Manual filter to ~800 clear positives. Drop:
   - Stock photos with watermark text overlapping the vehicle.
   - Images where the vehicle is < ~5% of frame area.
   - Stylized illustrations.

3. Add ~500 hard negatives (regular cars, small trucks, golf carts) so the
   model doesn't fire on every Smart car.

4. Label in Roboflow or Label Studio; export YOLO format into
   `labels/train/` and `labels/val/`. Use an 85/15 split.

5. Fine-tune:

   ```bash
   yolo train data=data/peo/peo.yaml model=yolov11n.pt \
       epochs=80 imgsz=640 freeze=10
   ```

   Freezes the backbone for the first 10 layers (the COCO knowledge stays
   useful for everything except the head).

6. Eval:

   ```bash
   yolo val model=runs/detect/train/weights/best.pt data=data/peo/peo.yaml
   ```

   Target: `mAP50 ≥ 0.80`, `mAP50-95 ≥ 0.55`. Below that, gather more data.

7. Drop the trained weights into `../../models/peo_yolov11n.pt`. The detector
   will pick them up via `Config.peo_class_keywords`.

## Legal / ethical

- Do NOT collect images of **identifiable people** in their official capacity
  for production use without consulting counsel. The model targets the
  *vehicle*, not the person.
- Don't share the raw scraped image bundle publicly; sources keep their own
  licenses. Share only the trained weights + this recipe.
