-- Dual Display Swap for Hammerspoon
-- Hotkey: Ctrl + Option + Cmd + S  →  swap all windows between the two displays.

local HOTKEY_MODS = { "ctrl", "alt", "cmd" }
local HOTKEY_KEY  = "s"

local function rescale(frame, fromScreenFrame, toScreenFrame)
    local relX = (frame.x - fromScreenFrame.x) / fromScreenFrame.w
    local relY = (frame.y - fromScreenFrame.y) / fromScreenFrame.h
    local relW = frame.w / fromScreenFrame.w
    local relH = frame.h / fromScreenFrame.h
    return {
        x = toScreenFrame.x + relX * toScreenFrame.w,
        y = toScreenFrame.y + relY * toScreenFrame.h,
        w = relW * toScreenFrame.w,
        h = relH * toScreenFrame.h,
    }
end

local function swapDisplays()
    local screens = hs.screen.allScreens()
    if #screens < 2 then
        hs.alert.show("Dual-display swap: 需要至少两台显示器")
        return
    end

    local screenA, screenB = screens[1], screens[2]
    local idA, idB = screenA:id(), screenB:id()
    local frameA, frameB = screenA:frame(), screenB:frame()

    local moves = {}
    for _, win in ipairs(hs.window.visibleWindows()) do
        if win:isStandard() and not win:isMinimized() then
            local sid = win:screen():id()
            local f = win:frame()
            if sid == idA then
                table.insert(moves, { win = win, frame = rescale(f, frameA, frameB) })
            elseif sid == idB then
                table.insert(moves, { win = win, frame = rescale(f, frameB, frameA) })
            end
        end
    end

    for _, m in ipairs(moves) do
        m.win:setFrame(m.frame, 0)
    end

    hs.alert.show(string.format("已交换 %d 个窗口", #moves))
end

hs.hotkey.bind(HOTKEY_MODS, HOTKEY_KEY, swapDisplays)
hs.alert.show("Dual-display swap 已加载 (⌃⌥⌘S)")
