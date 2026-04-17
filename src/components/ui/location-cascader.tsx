"use client";

import { useState, useEffect, useMemo } from "react";
import { Combobox, type ComboboxOption } from "./combobox";
import { Label } from "./label";

const VIETNAM_LOCATIONS: Record<string, { districts: Record<string, string[]> }> = {
  "Thành phố Hồ Chí Minh": {
    districts: {
      "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Cầu Kho", "Phường Cầu Ông Lãnh", "Phường Cô Giang", "Phường Đa Kao", "Phường Nguyễn Cư Trinh", "Phường Nguyễn Thái Bình", "Phường Phạm Ngũ Lão", "Phường Tân Định"],
      "Quận 3": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường Võ Thị Sáu"],
      "Quận 5": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"],
      "Quận 7": ["Phường Bình Thuận", "Phường Phú Mỹ", "Phường Phú Thuận", "Phường Tân Hưng", "Phường Tân Kiểng", "Phường Tân Phong", "Phường Tân Phú", "Phường Tân Quy"],
      "Quận 10": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"],
      "Quận Tân Bình": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15"],
      "Quận Phú Nhuận": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 13", "Phường 14", "Phường 15", "Phư���ng 17"],
      "Quận Bình Thạnh": ["Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 6", "Phường 7", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 17", "Phường 19", "Phường 21", "Phường 22", "Phư���ng 24", "Phường 25", "Phường 26", "Phường 27", "Phường 28"],
      "Quận Gò Vấp": ["Phường 1", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 8", "Phường 9", "Phường 10", "Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 16", "Phường 17"],
      "Thành phố Thủ Đức": ["Phường An Khánh", "Phường An Lợi Đông", "Phường An Phú", "Phường Bình Chiểu", "Phường Bình Thọ", "Phường Bình Trưng Đông", "Phường Bình Trưng Tây", "Phường Cát Lái", "Phường Hiệp Bình Chánh", "Phường Hiệp Bình Phước", "Phường Linh Chiểu", "Phường Linh Đông", "Phường Linh Tây", "Phường Linh Trung", "Phường Linh Xuân", "Phường Long Bình", "Phường Long Phước", "Phường Long Thạnh Mỹ", "Phường Long Trường", "Phường Phú Hữu", "Phường Phước Bình", "Phường Phước Long A", "Phường Phước Long B", "Phường Tam Bình", "Phường Tam Phú", "Phường Tân Phú", "Phường Thảo Điền", "Phường Thủ Thiêm", "Phường Trường Thạnh", "Phường Trường Thọ"],
    },
  },
  "Hà Nội": {
    districts: {
      "Hoàn Kiếm": ["Phường Chương Dương", "Phường Cửa Đông", "Phường Cửa Nam", "Phường Đồng Xuân", "Phường Hàng Bạc", "Phường Hàng Bài", "Phường Hàng Bồ", "Phường Hàng Buồm", "Phường Hàng Đào", "Phường Hàng Gai", "Phường Hàng Mã", "Phường Hàng Trống", "Phường Lý Thái Tổ", "Phường Phan Chu Trinh", "Phường Phúc Tân", "Phường Tràng Tiền", "Phường Trần Hưng Đạo"],
      "Ba Đình": ["Phường Cống Vị", "Phường Điện Biên", "Phường Đội Cấn", "Phường Giảng Võ", "Phường Kim Mã", "Phường Liễu Giai", "Phường Ngọc Hà", "Phường Ngọc Khánh", "Phường Nguyễn Trung Trực", "Phường Phúc Xá", "Phường Quán Thánh", "Phường Thành Công", "Phường Trúc Bạch", "Phường Vĩnh Phúc"],
      "Đống Đa": ["Phường Cát Linh", "Phường Hàng Bột", "Phường Khâm Thiên", "Phường Khương Thượng", "Phường Kim Liên", "Phường Láng Hạ", "Phường Láng Thượng", "Phường Nam Đồng", "Phường Ngã Tư Sở", "Phường Ô Chợ Dừa", "Phường Phương Liên", "Phường Phương Mai", "Phường Quang Trung", "Phường Quốc Tử Giám", "Phường Thịnh Quang", "Phường Thổ Quan", "Phường Trung Liệt", "Phường Trung Phụng", "Phường Trung Tự", "Phường Văn Chương", "Phường Văn Miếu"],
      "Cầu Giấy": ["Phường Dịch Vọng", "Phường Dịch Vọng Hậu", "Phường Mai Dịch", "Phường Nghĩa Đô", "Phường Nghĩa Tân", "Phường Quan Hoa", "Phường Trung Hòa", "Phường Yên Hòa"],
      "Hai Bà Trưng": ["Phường Bạch Đằng", "Phường Bạch Mai", "Phường Bách Khoa", "Phường Cầu Dền", "Phường Đống Mác", "Phường Đồng Nhân", "Phường Đồng Tâm", "Phường Lê Đại Hành", "Phường Minh Khai", "Phường Ngô Thì Nhậm", "Phường Nguyễn Du", "Phường Phạm Đình Hổ", "Phường Phố Huế", "Phường Quỳnh Lôi", "Phường Quỳnh Mai", "Phường Thanh Lương", "Phường Thanh Nhàn", "Phường Trương Định", "Phường Vĩnh Tuy"],
      "Thanh Xuân": ["Phường Hạ Đình", "Phường Khương Đình", "Phường Khương Mai", "Phường Khương Trung", "Phường Kim Giang", "Phường Nhân Chính", "Phường Phương Liệt", "Phường Thanh Xuân Bắc", "Phường Thanh Xuân Nam", "Phường Thanh Xuân Trung", "Phường Thượng Đình"],
    },
  },
  "Đà Nẵng": {
    districts: {
      "Hải Châu": ["Phường Bình Hiên", "Phường Bình Thuận", "Phường Hải Châu I", "Phường Hải Châu II", "Phường Hòa Cường Bắc", "Phường Hòa Cường Nam", "Phường Hòa Thuận Đông", "Phường Hòa Thuận Tây", "Phường Nam Dương", "Phường Phước Ninh", "Phường Thạch Thang", "Phường Thanh Bình", "Phường Thuận Phước"],
      "Thanh Khê": ["Phường An Khê", "Phường Chính Gián", "Phường Hòa Khê", "Phường Tam Thuận", "Phường Tân Chính", "Phường Thạc Gián", "Phường Thanh Khê Đông", "Phường Thanh Khê Tây", "Phường Vĩnh Trung", "Phường Xuân Hà"],
      "Sơn Trà": ["Phường An Hải Bắc", "Phường An Hải Đông", "Phường An Hải Tây", "Phường Mân Thái", "Phường Nại Hiên Đông", "Phường Phước Mỹ", "Phường Thọ Quang"],
      "Ngũ Hành Sơn": ["Phường Hòa Hải", "Phường Hòa Quý", "Phường Khuê Mỹ", "Phường Mỹ An"],
    },
  },
  "Cần Thơ": {
    districts: {
      "Ninh Kiều": ["Phường An Bình", "Phường An Cư", "Phường An Hòa", "Phường An Khánh", "Phường An Nghiệp", "Phường An Phú", "Phường Cái Khế", "Phường Hưng Lợi", "Phường Tân An", "Phường Thới Bình", "Phường Xuân Khánh"],
      "Bình Thủy": ["Phường An Thới", "Phường Bình Thủy", "Phường Bùi Hữu Nghĩa", "Phường Long Hòa", "Phường Long Tuyền", "Phường Thới An Đông", "Phường Trà An", "Phường Trà Nóc"],
    },
  },
  "Hải Phòng": {
    districts: {
      "Hồng Bàng": ["Phường Hạ Lý", "Phường Hoàng Văn Thụ", "Phường Minh Khai", "Phường Phan Bội Châu", "Phường Quán Toan", "Phường Sở Dầu", "Phường Thượng Lý", "Phường Trại Chuối"],
      "Lê Chân": ["Phường An Biên", "Phường An Dương", "Phường Cát Dài", "Phường Đông Hải", "Phường Dư Hàng", "Phường Dư Hàng Kênh", "Phường Hàng Kênh", "Phường Hồ Nam", "Phường Kênh Dương", "Phường Lam Sơn", "Phường Nghĩa Xá", "Phường Niệm Nghĩa", "Phường Tràng Minh", "Phường Trại Cau", "Phường Vĩnh Niệm"],
    },
  },
};

interface LocationCascaderProps {
  city: string;
  district: string;
  ward: string;
  onCityChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onWardChange: (v: string) => void;
  cityLabel?: string;
  districtLabel?: string;
  wardLabel?: string;
}

export function LocationCascader({
  city,
  district,
  ward,
  onCityChange,
  onDistrictChange,
  onWardChange,
  cityLabel = "City/Province",
  districtLabel = "District",
  wardLabel = "Ward",
}: LocationCascaderProps) {
  const cityOptions: ComboboxOption[] = useMemo(
    () => Object.keys(VIETNAM_LOCATIONS).map(c => ({ value: c, label: c })),
    []
  );

  const districtOptions: ComboboxOption[] = useMemo(() => {
    if (!city || !VIETNAM_LOCATIONS[city]) return [];
    return Object.keys(VIETNAM_LOCATIONS[city].districts).map(d => ({ value: d, label: d }));
  }, [city]);

  const wardOptions: ComboboxOption[] = useMemo(() => {
    if (!city || !district || !VIETNAM_LOCATIONS[city]?.districts[district]) return [];
    return VIETNAM_LOCATIONS[city].districts[district].map(w => ({ value: w, label: w }));
  }, [city, district]);

  const handleCityChange = (v: string) => {
    onCityChange(v);
    onDistrictChange("");
    onWardChange("");
  };

  const handleDistrictChange = (v: string) => {
    onDistrictChange(v);
    onWardChange("");
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label>{cityLabel}</Label>
        <Combobox
          options={cityOptions}
          value={city}
          onChange={handleCityChange}
          placeholder="Search city..."
        />
      </div>
      <div className="space-y-2">
        <Label>{districtLabel}</Label>
        <Combobox
          options={districtOptions}
          value={district}
          onChange={handleDistrictChange}
          placeholder="Search district..."
        />
      </div>
      <div className="space-y-2">
        <Label>{wardLabel}</Label>
        <Combobox
          options={wardOptions}
          value={ward}
          onChange={onWardChange}
          placeholder="Search ward..."
        />
      </div>
    </div>
  );
}
